import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BOARD_PRESET_ID, GameEngine, MAX_EVENT_CHAIN, SPECIAL_TILE_TYPES } from "./gameEngine.js";
import { effectsForPool } from "./rouletteConfig.js";
import SetupScreen from "./components/SetupScreen.jsx";
import Board from "./components/Board.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MatchResults from "./components/MatchResults.jsx";
import WheelOfFate from "./components/WheelOfFate.jsx";
import DecisionModal from "./components/DecisionModal.jsx";
import GameFeedback from "./components/GameFeedback.jsx";
import GameMenu from "./components/GameMenu.jsx";
import PlayModeScreen from "./components/PlayModeScreen.jsx";
import OnlineLobby from "./components/OnlineLobby.jsx";
import PowerUpGuide from "./components/PowerUpGuide.jsx";
import {
  ANIMATION_SPEEDS,
  createSettings,
  DEFAULT_PREFERENCES,
  GAME_BALANCE,
  loadPreferences,
  MODE_PRESETS,
  savePreferences,
  TOKEN_ICONS,
} from "./gameConfig.js";
import { AudioManager } from "./audioManager.js";

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function App() {
  const [playType, setPlayType] = useState(() => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem("snake-ladder-online-session-v1") ? "online" : null;
  });
  const [profiles, setProfiles] = useState(() =>
    Array.from({ length: 4 }, (_, i) => ({
      name: "",
      color: ["#ea5b3d", "#3c73df", "#23a476", "#9a62d5"][i],
      icon: TOKEN_ICONS[i],
      isBot: false,
      difficulty: "normal",
    })),
  );
  const [preferences, setPreferences] = useState(() =>
    typeof localStorage === "undefined"
      ? DEFAULT_PREFERENCES
      : loadPreferences(),
  );
  const [mode, setMode] = useState(preferences.preferredMode);
  const [settings, setSettings] = useState(() =>
    createSettings(preferences.preferredMode),
  );
  const [boardPresetId, setBoardPresetId] = useState(DEFAULT_BOARD_PRESET_ID);
  const [engine, setEngine] = useState(null);
  const [revision, setRevision] = useState(0);
  const [dice, setDice] = useState(1);
  const [secondDice, setSecondDice] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [hint, setHint] = useState("Roll to make your move");
  const [activeTile, setActiveTile] = useState(null);
  const [finalLandingTile, setFinalLandingTile] = useState(null);
  const [movingPlayerId, setMovingPlayerId] = useState(null);
  const [connectionTravel, setConnectionTravel] = useState(null);
  const [wheel, setWheel] = useState(null);
  const [decision, setDecision] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [powerGuideOpen, setPowerGuideOpen] = useState(false);
  const choiceResolver = useRef(null);
  const wheelResolver = useRef(null);
  const feedbackTimer = useRef(null);
  const tileTimer = useRef(null);
  const gameVersion = useRef(0);
  const audio = useRef(null);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    audio.current = new AudioManager(preferences);
    return () => { window.clearTimeout(feedbackTimer.current); window.clearTimeout(tileTimer.current); };
  }, []);
  useEffect(() => {
    audio.current?.update(preferences);
    savePreferences(preferences);
  }, [preferences]);
  const speed = ANIMATION_SPEEDS.cinematic;
  const start = () => {
    gameVersion.current++;
    audio.current?.unlock();
    const matchSettings = { ...(mode === "custom" ? settings : MODE_PRESETS[mode]), animationSpeed: "cinematic" };
    setPreferences((value) => ({
      ...value,
      preferredMode: mode,
      animationSpeed: matchSettings.animationSpeed,
    }));
    setEngine(new GameEngine(profiles, { mode, settings: matchSettings, boardPresetId }));
  };
  const closePending = () => {
    choiceResolver.current?.(null);
    wheelResolver.current?.(null);
    choiceResolver.current = null;
    wheelResolver.current = null;
    setDecision(null);
    setWheel(null);
  };
  const newGame = () => {
    gameVersion.current++;
    closePending();
    setFeedback(null);
    setActiveTile(null);
    setFinalLandingTile(null);
    setMovingPlayerId(null);
    setConnectionTravel(null);
    setPaused(false);
    setSettingsOpen(false);
    setEngine(null);
  };
  const replay = () => {
    gameVersion.current++;
    closePending();
    engine.reset();
    setDice(1);
    setSecondDice(null);
    setHint("Roll to make your move");
    setFeedback(null);
    setActiveTile(null);
    setFinalLandingTile(null);
    setMovingPlayerId(null);
    setConnectionTravel(null);
    refresh();
  };
  const flashTile = (tile, final = false, duration = 360) => {
    window.clearTimeout(tileTimer.current);
    setActiveTile(tile);
    setFinalLandingTile(final ? tile : null);
    tileTimer.current = window.setTimeout(() => { setActiveTile(null); setFinalLandingTile(null); }, duration);
  };
  const showFeedback = (icon, text, type = "") => {
    window.clearTimeout(feedbackTimer.current);
    setFeedback({ icon, text, type });
    feedbackTimer.current = window.setTimeout(
      () => setFeedback(null),
      speed.feedback,
    );
  };
  const pickBotOption = (config) => {
    const options = config.options.filter(
      (option) => option.value !== "take" && option.value !== "discard",
    );
    if (!options.length) return config.options[0]?.value;
    if (config.kind === "dice")
      return options.reduce((best, option) =>
        Number(option.value) > Number(best.value) ? option : best,
      ).value;
    if (config.kind === "target" && config.aiPlayer?.difficulty !== "easy")
      return options.reduce((best, option) =>
        (option.player?.position || 0) > (best.player?.position || 0)
          ? option
          : best,
      ).value;
    if (config.kind === "defense")
      return (
        options.find((option) => option.value === "reflect")?.value ||
        options[0].value
      );
    return options[Math.floor(Math.random() * options.length)].value;
  };
  const requestDecision = (config) =>
    new Promise((resolve) => {
      choiceResolver.current = resolve;
      setDecision(config);
      if (config.aiPlayer?.isBot)
        window.setTimeout(() => {
          choiceResolver.current = null;
          setDecision(null);
          resolve(pickBotOption(config));
        }, speed.bot);
    });
  const completeDecision = (value) => {
    const resolve = choiceResolver.current;
    choiceResolver.current = null;
    setDecision(null);
    resolve?.(value);
  };
  const requestWheel = (player, wheelType = 'fate') =>
    new Promise((resolve) => {
      wheelResolver.current = resolve;
      setWheel({ player, wheelType });
    });
  const completeWheel = (effect) => {
    const resolve = wheelResolver.current;
    wheelResolver.current = null;
    setWheel(null);
    resolve?.(effect);
  };

  const animateMovement = useCallback(
    async (player, amount, options = {}) => {
      const move = engine.planMovement(player, amount, options);
      if (move.blocked) return move;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const baseStep = options.pullBack ? speed.pullBackStep : options.power ? speed.powerStep : speed.tileStep;
      const stepDuration = reduced ? Math.min(110, baseStep) : baseStep;
      setMovingPlayerId(player.id);
      for (const [index, position] of move.path.entries()) {
        const final = index === move.path.length - 1;
        engine.setPosition(player, position);
        player.stats.totalSpacesMoved++;
        audio.current?.play("move");
        flashTile(position, final, final ? speed.finalLandingPause : stepDuration);
        refresh();
        await sleep(stepDuration);
      }
      setMovingPlayerId(null);
      return move;
    },
    [engine, refresh],
  );

  const storePower = useCallback(
    async (player, effect) => {
      if (engine.addPower(player, effect.id)) {
        engine.log(`${player.name} stored ${effect.name}.`, "defense");
        showFeedback(effect.icon, `${effect.name} stored`, effect.category);
        refresh();
        return;
      }
      const value = await requestDecision({
        kind: "inventory",
        aiPlayer: player,
        icon: "🎒",
        eyebrow: "Power inventory full",
        title: "Choose what to keep",
        message: `New power: ${effect.icon} ${effect.name}`,
        options: [
          ...player.inventory.map((id) => {
            const power = engine.getPower(id);
            return {
              value: id,
              icon: power.icon,
              category: power.category,
              label: `Replace ${power.name}`,
              detail: `${power.icon} Stored power`,
            };
          }),
          {
            value: "discard",
            icon: "🗑️",
            label: "Discard new power",
            detail: "Keep your current inventory",
            tone: "quiet",
          },
        ],
      });
      if (value && value !== "discard") {
        engine.replacePower(player, value, effect.id);
        engine.log(
          `${player.name} replaced ${engine.getPower(value).name} with ${effect.name}.`,
          "defense",
        );
      } else engine.log(`${player.name} discarded ${effect.name}.`);
      refresh();
    },
    [engine, refresh],
  );

  const resolveAttack = useCallback(
    async (type, attacker, target) => {
      attacker.stats.attacksUsed++;
      target.stats.attacksReceived++;
      const defenses = engine.defenseOptions(target);
      let response = "take";
      if (defenses.length === 1 && defenses[0] === "reflect")
        response = "reflect";
      else if (defenses.length)
        response = await requestDecision({
          kind: "defense",
          aiPlayer: target,
          icon: "⚔️",
          eyebrow: `${attacker.name} attacks`,
          title: `${target.name}, defend yourself`,
          message:
            type === "pull-back"
              ? "Pull Back will move you backward 3 tiles."
              : "Position Swap will exchange your places.",
          options: [
            ...defenses.map((id) => ({
              value: id,
              icon: engine.getPower(id).icon,
              category: "defense",
              label: id === "reflect" ? "Reflect attack" : "Cancel attack",
              detail: `${engine.getPower(id).icon} Consume ${engine.getPower(id).name}`,
            })),
            {
              value: "take",
              icon: "💥",
              category: "attack",
              label: "Take the hit",
              detail: "Save your defenses",
              tone: "quiet",
            },
          ],
        });
      if (response === "cancel") {
        engine.consumePower(target, "cancel");
        target.stats.defensesActivated++;
        engine.log(
          `${target.name} cancelled ${attacker.name}'s attack!`,
          "defense",
        );
        showFeedback("❌", "Attack cancelled!", "defense");
        audio.current?.play("defense");
        refresh();
        return;
      }
      let recipient = target;
      if (response === "reflect") {
        engine.consumePower(target, "reflect");
        target.stats.defensesActivated++;
        recipient = attacker;
        engine.log(`${target.name} activated Reflect!`, "defense");
        showFeedback("🪞", "Attack reflected!", "defense");
        audio.current?.play("defense");
        refresh();
        await sleep(speed.event);
      }
      audio.current?.play("attack");
      if (type === "pull-back") {
        const from = recipient.position;
        await animateMovement(recipient, -GAME_BALANCE.pullBackMovement, { exact: false, pullBack: true });
        engine.log(
          `${recipient.name} moved backward from ${from || "Start"} to ${recipient.position}.`,
          "attack",
        );
      } else if (recipient === attacker)
        engine.log(`The reflected Position Swap had no effect.`, "attack");
      else {
        setMovingPlayerId(attacker.id);
        await sleep(speed.swapTravel / 2);
        const attackerPosition = attacker.position;
        attacker.position = target.position;
        target.position = attackerPosition;
        attacker.stats.playersSwapped++;
        engine.log(
          `${attacker.name} swapped positions with ${target.name}.`,
          "attack",
        );
        flashTile(attacker.position, true, speed.swapTravel / 2);
        refresh();
        await sleep(speed.swapTravel / 2);
        setMovingPlayerId(null);
      }
      refresh();
      await sleep(speed.event / 2);
    },
    [engine, refresh],
  );

  const applyEffect = useCallback(
    async (effect, player, depth, resolveBoardEvents) => {
      engine.log(`${player.name} spun ${effect.name}.`, effect.category);
      refresh();
      if (effect.category === "chaos") player.stats.chaosEvents++;
      if (effect.stored) {
        await storePower(player, effect);
        return;
      }
      if (["boost", "backtrack", "jackpot"].includes(effect.id)) {
        const amount =
          effect.id === "boost"
            ? GAME_BALANCE.boostMovement
            : effect.id === "jackpot"
              ? GAME_BALANCE.jackpotMovement
              : -GAME_BALANCE.backtrackMovement;
        showFeedback(
          effect.icon,
          `${effect.name} ${amount > 0 ? "+" : ""}${amount}!`,
          effect.category,
        );
        const move = await animateMovement(player, amount, { exact: false, power: true });
        engine.log(
          `${player.name} moved from ${move.from || "Start"} to ${player.position}.`,
          effect.category,
        );
        refresh();
        if (player.position === 100) return;
        await sleep(speed.finalLandingPause / 2);
        await resolveBoardEvents(player, depth + 1);
      } else if (effect.id === "skip-turn") {
        player.statusEffects.skipNextTurn = true;
        engine.log(`${player.name} will skip their next turn.`, "penalty");
        showFeedback("🚫", "Skip turn queued", "penalty");
      } else if (effect.id === "dice-curse") {
        player.statusEffects.diceCurse = true;
        engine.log(`${player.name} is affected by Dice Curse.`, "penalty");
        showFeedback("💀", "Cursed!", "penalty");
      } else if (effect.id === "extra-turn") {
        engine.pendingExtraTurn = true;
        engine.log(`${player.name} won an extra turn.`, "power");
        showFeedback("🎲", "Extra turn!", "power");
      } else if (effect.id === "position-swap" || effect.id === "pull-back") {
        const targets = engine.players.filter(
          (candidate) => candidate !== player,
        );
        const targetId = await requestDecision({
          kind: "target",
          aiPlayer: player,
          icon: effect.icon,
          eyebrow: effect.name,
          title: "Choose a player",
          message: effect.description,
          options: targets.map((target) => ({
            value: target.id,
            label: target.name,
            detail: `P${target.id} · Tile ${target.position || "Start"}`,
            player: target,
          })),
        });
        const target = targets.find((candidate) => candidate.id === targetId);
        if (target) {
          engine.log(
            `${player.name} used ${effect.name} against ${target.name}.`,
            "attack",
          );
          await resolveAttack(effect.id, player, target);
        }
      } else if (effect.id === "everyone-back") {
        for (const rival of engine.players.filter(
          (candidate) => candidate !== player,
        ))
          engine.setPosition(
            rival,
            Math.max(1, rival.position - GAME_BALANCE.everyoneBackMovement),
          );
        engine.log(
          `Everyone moved backward ${GAME_BALANCE.everyoneBackMovement} spaces!`,
          "chaos",
        );
        showFeedback("🔥", "Everyone back!", "chaos");
      } else if (effect.id === "rocket") {
        await animateMovement(player, GAME_BALANCE.rocketMovement, {
          exact: false,
          power: true,
        });
        engine.log(`${player.name} launched forward 10 spaces!`, "chaos");
        await resolveBoardEvents(player, depth + 1);
      } else if (effect.id === "snake-panic") {
        const rivals = engine.players.filter(
          (candidate) => candidate !== player,
        );
        const rival = rivals[Math.floor(Math.random() * rivals.length)];
        const valid = Object.entries(engine.snakes)
          .map(([head, bottom]) => ({ head: Number(head), bottom }))
          .filter((snake) => snake.bottom < rival.position)
          .sort((a, b) => b.bottom - a.bottom)[0];
        if (valid) {
          engine.setPosition(rival, valid.bottom);
          engine.log(
            `Snake Panic dropped ${rival.name} to ${valid.bottom}!`,
            "chaos",
          );
        } else
          engine.log(`Snake Panic found no target for ${rival.name}.`, "chaos");
      } else if (effect.id === "ladder-rush") {
        const start = Object.keys(engine.ladders)
          .map(Number)
          .filter((tile) => tile > player.position)
          .sort((a, b) => a - b)[0];
        if (start) {
          engine.setPosition(player, engine.ladders[start]);
          engine.log(
            `${player.name} rushed up the ladder at ${start} to ${engine.ladders[start]}!`,
            "chaos",
          );
        } else {
          await animateMovement(player, 3, { exact: false, power: true });
          engine.log(`${player.name} found no ladder and moved +3.`, "chaos");
        }
        await resolveBoardEvents(player, depth + 1);
      } else if (effect.id === "mass-shuffle") {
        const positions = engine.players
          .map((item) => item.position)
          .sort(() => Math.random() - 0.5);
        engine.players.forEach((item, index) => {
          item.position = positions[index];
        });
        engine.log(`Mass Shuffle reassigned every position!`, "chaos");
        showFeedback("🔀", "Mass shuffle!", "chaos");
      } else if (
        effect.id === "leader-trouble" ||
        effect.id === "last-place-boost"
      ) {
        const positions = engine.players.map((item) => item.position);
        const edge =
          effect.id === "leader-trouble"
            ? Math.max(...positions)
            : Math.min(...positions);
        const candidates = engine.players.filter(
          (item) => item.position === edge,
        );
        const chosen =
          candidates[Math.floor(Math.random() * candidates.length)];
        const amount =
          effect.id === "leader-trouble"
            ? -GAME_BALANCE.leaderTroubleMovement
            : GAME_BALANCE.lastPlaceBoostMovement;
        engine.setPosition(chosen, chosen.position + amount);
        engine.log(
          `${chosen.name} ${amount < 0 ? "fell back" : "surged forward"} ${Math.abs(amount)} spaces.`,
          "chaos",
        );
      } else if (effect.id === "dice-battle") {
        const rivals = engine.players.filter(
          (candidate) => candidate !== player,
        );
        const id = await requestDecision({
          kind: "target",
          aiPlayer: player,
          icon: "🎲",
          eyebrow: "Dice Battle",
          title: "Choose a challenger",
          options: rivals.map((target) => ({
            value: target.id,
            label: target.name,
            detail: `Tile ${target.position || "Start"}`,
            player: target,
          })),
        });
        const rival = rivals.find((item) => item.id === id);
        if (rival) {
          let a,
            b,
            guard = 0;
          do {
            a = engine.roll();
            b = engine.roll();
            guard++;
          } while (a === b && guard < 5);
          const winner = a >= b ? player : rival;
          const loser = winner === player ? rival : player;
          engine.setPosition(winner, winner.position + 5);
          engine.setPosition(loser, loser.position - 2);
          engine.log(`${winner.name} won the Dice Battle ${a}–${b}!`, "chaos");
        }
      }
      refresh();
    },
    [animateMovement, engine, refresh, resolveAttack, storePower],
  );

  const resolveBoardEvents = useCallback(
    async function resolve(player, depth = 0) {
      if (depth >= MAX_EVENT_CHAIN) {
        engine.log("Event chain limit reached. Turn safely ended.", "blocked");
        return;
      }
      if (player.position === 100) return;
      const event = engine.boardEventAt(player.position);
      if (!event) return;
      if (event.type === "snake") {
        player.stats.snakesHit++;
        if (engine.consumePower(player, "snake-shield")) {
          player.stats.defensesActivated++;
          engine.log(
            `${player.name}'s Snake Shield blocked the snake!`,
            "defense",
          );
          showFeedback("🛡️", "Snake Shield activated!", "defense");
          audio.current?.play("defense");
          refresh();
          await sleep(speed.event);
          return;
        }
        const snakeDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : speed.snakeTravel;
        audio.current?.play("snake");
        showFeedback("🐍", "Snake!", "penalty");
        setActiveTile(event.from);
        setConnectionTravel({ type: 'snake', start: event.from, end: event.to, playerId: player.id, icon: player.icon, color: player.color, duration: snakeDuration });
        refresh();
        await sleep(snakeDuration);
        engine.setPosition(player, event.to);
        setConnectionTravel(null);
        engine.log(`${player.name} slid down a snake to ${event.to}.`, "snake");
        flashTile(event.to, true, speed.finalLandingPause);
        refresh();
        await sleep(speed.finalLandingPause);
        return resolve(player, depth + 1);
      }
      if (event.type === "ladder") {
        player.stats.laddersClimbed++;
        const ladderDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : speed.ladderTravel;
        audio.current?.play("ladder");
        showFeedback("🪜", "Ladder!", "power");
        setActiveTile(event.from);
        setConnectionTravel({ type: 'ladder', start: event.from, end: event.to, playerId: player.id, icon: player.icon, color: player.color, duration: ladderDuration });
        refresh();
        await sleep(ladderDuration);
        engine.setPosition(player, event.to);
        setConnectionTravel(null);
        engine.log(`${player.name} climbed a ladder to ${event.to}!`, "ladder");
        flashTile(event.to, true, speed.finalLandingPause);
        refresh();
        await sleep(speed.finalLandingPause);
        return resolve(player, depth + 1);
      }
      const special = SPECIAL_TILE_TYPES[event.specialType] || SPECIAL_TILE_TYPES.fate;
      player.stats.rouletteSpins++;
      engine.log(`${player.name} landed on ${special.label}!`, event.specialType === 'chaos' ? 'chaos' : 'bonus');
      refresh();
      const effect = await requestWheel(player, event.specialType);
      if (effect) {
        audio.current?.play("result");
        await applyEffect(effect, player, depth, resolve);
      }
      return null;
    },
    [applyEffect, engine, refresh],
  );

  const animateDice = async () => {
    setRolling(true);
    for (let i = 0; i < 8; i++) {
      setDice(1 + Math.floor(Math.random() * 6));
      await sleep(65);
    }
    setRolling(false);
  };
  const rollTurn = useCallback(async () => {
    if (!engine || engine.busy || engine.winner || wheel || decision) return;
    const version = gameVersion.current;
    engine.busy = true;
    setHint("Rolling the dice…");
    setSecondDice(null);
    refresh();
    let rawRoll = engine.roll();
    let selectedRoll = rawRoll;
    if (engine.hasPower(engine.currentPlayer, "double-roll")) {
      const alternative = engine.roll();
      await animateDice();
      setDice(rawRoll);
      setSecondDice(alternative);
      engine.consumePower(engine.currentPlayer, "double-roll");
      refresh();
      const choice = await requestDecision({
        kind: "dice",
        aiPlayer: engine.currentPlayer,
        icon: "⚡",
        eyebrow: "Double Roll activated",
        title: "Choose your roll",
        message: "Choose one result — they are not added together.",
        options: [
          { value: rawRoll, icon: "🎲", label: `Move ${rawRoll}`, detail: "First die" },
          {
            value: alternative,
            icon: "🎲",
            label: `Move ${alternative}`,
            detail: "Second die",
          },
        ],
      });
      selectedRoll = choice ?? rawRoll;
      setDice(selectedRoll);
      setSecondDice(null);
    } else {
      await animateDice();
      setDice(rawRoll);
    }
    if (version !== gameVersion.current) return;
    const player = engine.currentPlayer;
    player.stats.diceRolls++;
    player.stats.diceTotal += selectedRoll;
    audio.current?.play("dice");
    let movement = selectedRoll;
    if (player.statusEffects.diceCurse) {
      movement = Math.max(1, movement - GAME_BALANCE.diceCursePenalty);
      player.statusEffects.diceCurse = false;
      player.stats.penaltiesReceived++;
      engine.log(
        `${player.name} rolled ${selectedRoll} → Curse reduced movement to ${movement}.`,
        "penalty",
      );
      showFeedback("💀", `${selectedRoll} reduced to ${movement}`, "penalty");
    } else engine.log(`${player.name} rolled ${selectedRoll}.`, "roll");
    refresh();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    await sleep(reducedMotion ? 100 : speed.diceResultPause);
    const move = await animateMovement(player, movement, { exact: true });
    if (move.blocked) {
      engine.log(`${player.name} needs an exact roll to reach 100.`, "blocked");
      setHint("Too high — no move");
      await sleep(reducedMotion ? 100 : speed.finalLandingPause);
    } else {
      if (move.bounced) {
        engine.log(`${player.name} passed 100 and bounced back ${move.overshoot} tile${move.overshoot === 1 ? "" : "s"}.`, "blocked");
        showFeedback("↩️", `Bounce back ${move.overshoot}!`, "penalty");
      }
      engine.log(
        `${player.name} moved from ${move.from || "Start"} to ${player.position}.`,
      );
      refresh();
      await sleep(reducedMotion ? 100 : speed.finalLandingPause);
      await resolveBoardEvents(player);
    }
    if (version !== gameVersion.current) return;
    const turn = engine.advanceTurn({ rolledSix: selectedRoll === 6 });
    if (!turn.winner) {
      const skipped = engine.skipUnavailableTurns();
      if (skipped.length) {
        showFeedback("🚫", `${skipped.at(-1).name} loses this turn`, "penalty");
        await sleep(reducedMotion ? 100 : speed.event);
      }
    }
    engine.busy = false;
    setHint(
      engine.winner
        ? "Game over"
        : turn.extraTurn
          ? "Extra turn — roll again"
          : "Pass to the next player",
    );
    refresh();
  }, [animateMovement, decision, engine, refresh, resolveBoardEvents, wheel]);

  const currentIndex = engine?.currentIndex;
  useEffect(() => {
    if (
      !engine?.currentPlayer.isBot ||
      engine.busy ||
      engine.winner ||
      paused ||
      wheel ||
      decision
    )
      return;
    const timer = window.setTimeout(rollTurn, speed.bot);
    return () => window.clearTimeout(timer);
  }, [currentIndex, decision, engine, paused, revision, rollTurn, wheel]);
  useEffect(() => {
    const key = (event) => {
      if (event.code === "Escape" && settingsOpen && !decision && !wheel)
        setSettingsOpen(false);
      if (event.code === "Space" && engine && !paused && !wheel && !decision) {
        event.preventDefault();
        rollTurn();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [decision, engine, paused, rollTurn, settingsOpen, wheel]);
  if (!playType) return <PlayModeScreen onLocal={() => setPlayType('local')} onOnline={() => setPlayType('online')} />;
  if (playType === 'online') return <OnlineLobby onBack={() => setPlayType(null)} />;
  if (!engine)
    return (
      <SetupScreen
        profiles={profiles}
        setProfiles={setProfiles}
        mode={mode}
        setMode={setMode}
        settings={settings}
        setSettings={setSettings}
        boardPresetId={boardPresetId}
        setBoardPresetId={setBoardPresetId}
        onStart={start}
      />
    );
  const specialTiles = engine.specialTiles;
  return (
    <main style={{ "--current": engine.currentPlayer.color }}>
      <section className="game-screen">
        <header className="game-header">
          <div className="brand">
            <span className="brand-mark">S&L</span>
            <div>
              <strong>Snakes & Ladders</strong>
              <small>
                {engine.settings.name} · relaxed pace
              </small>
            </div>
          </div>
          <div className="header-actions">
            <button className="guide-button" type="button" onClick={() => setPowerGuideOpen(true)}>✨ Powers</button>
            <span className="rule-chip">
              {engine.settings.exactRoll
                ? "Exact roll to win"
                : "Reach or pass 100"}
            </span>
            <button
              className="icon-button"
              type="button"
              title="Audio settings"
              onClick={() => setSettingsOpen(true)}
            >
              ⚙
            </button>
            <button
              className="icon-button"
              type="button"
              title="Pause"
              disabled={engine.busy}
              onClick={() => setPaused(true)}
            >
              Ⅱ
            </button>
          </div>
        </header>
        <div className="turn-intro">
          <span style={{ background: engine.currentPlayer.color }}>
            {engine.currentPlayer.icon}
          </span>
          <strong>{engine.currentPlayer.name}&apos;s turn</strong>
          <small>
            Tile {engine.currentPlayer.position || "Start"} ·{" "}
            {engine.currentPlayer.inventory
              .map((id) => engine.getPower(id).icon)
              .join(" ") || "No powers"}
          </small>
        </div>
        <div className="game-layout">
          <Board
            players={engine.players}
            activeTile={activeTile}
            finalLandingTile={finalLandingTile}
            specialTiles={specialTiles}
            snakes={engine.snakes}
            ladders={engine.ladders}
            currentPlayerId={engine.currentPlayer.id}
            movingPlayerId={movingPlayerId}
            connectionTravel={connectionTravel}
          />
          <Sidebar
            engine={engine}
            dice={dice}
            secondDice={secondDice}
            rolling={rolling}
            onRoll={rollTurn}
            hint={hint}
            paused={paused}
            onClear={() => {
              engine.history = [];
              refresh();
            }}
          />
        </div>
      </section>
      <GameFeedback feedback={feedback} />
      <PowerUpGuide open={powerGuideOpen} onClose={() => setPowerGuideOpen(false)} />
      {wheel && (
        <WheelOfFate
          player={wheel.player}
          wheelType={wheel.wheelType}
          effects={effectsForPool(wheel.wheelType, engine.settings)}
          chooseEffect={() => engine.spin(Math.random, wheel.wheelType)}
          onComplete={completeWheel}
          onNewGame={newGame}
          duration={speed.wheel}
          autoSpin={wheel.player.isBot}
        />
      )}
      <DecisionModal
        decision={decision}
        onChoose={completeDecision}
        onNewGame={newGame}
      />
      <GameMenu
        paused={paused}
        setPaused={setPaused}
        open={settingsOpen}
        setOpen={setSettingsOpen}
        preferences={preferences}
        setPreferences={setPreferences}
        onRestart={replay}
        onNewGame={newGame}
      />
      <MatchResults engine={engine} onReplay={replay} onNewGame={newGame} />
    </main>
  );
}
