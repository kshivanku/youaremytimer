import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import eyesOpen from "../assets/eyes-open.png";
import eyesShut from "../assets/eyes-shut.png";
import skyLoop from "../assets/Sunny_cloudy_sky_loop.mp4";

const openingLine = "You are a timer. Tell me when you're ready to work.";
const humanVoiceHints = [
  "samantha",
  "daniel",
  "karen",
  "moira",
  "tessa",
  "google us english",
  "google uk english",
  "microsoft aria",
  "microsoft jenny",
  "natural",
  "enhanced",
  "premium"
];

const ratingLabels = {
  1: "poor",
  2: "low",
  3: "meets most",
  4: "meets",
  5: "exceeds"
};

function getRandomSeconds(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const minuteLabel = minutes === 1 ? "minute" : "minutes";

  if (remainingSeconds === 0) {
    return `${minutes} ${minuteLabel}`;
  }

  return `${minutes} ${minuteLabel} and ${remainingSeconds} seconds`;
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function useTypedText(text, speed = 42) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");

    if (!text) {
      return undefined;
    }

    let frame = 0;
    const interval = window.setInterval(() => {
      frame += 1;
      setVisibleText(text.slice(0, frame));

      if (frame >= text.length) {
        window.clearInterval(interval);
      }
    }, speed);

    return () => window.clearInterval(interval);
  }, [text, speed]);

  return visibleText;
}

function chooseHumanVoice(voices) {
  const englishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("en"));

  return (
    englishVoices.find((voice) =>
      humanVoiceHints.some((hint) => voice.name.toLowerCase().includes(hint))
    ) ||
    englishVoices.find((voice) => voice.localService) ||
    englishVoices[0] ||
    voices[0] ||
    null
  );
}

function App() {
  const [phase, setPhase] = useState("opening");
  const [taskCount, setTaskCount] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [rating, setRating] = useState(4);
  const [earnings, setEarnings] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState(null);
  const [earningFeedback, setEarningFeedback] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [voices, setVoices] = useState([]);

  const targetLabel = targetSeconds ? formatDuration(targetSeconds) : "";
  const line = phase === "opening" ? openingLine : `Tell me when it is ${targetLabel}.`;
  const ready = phase !== "opening";
  const typedLine = useTypedText(line, ready ? 58 : 38);
  const isTyping = typedLine.length < line.length;
  const isTiming = phase === "timing";

  const orbState = useMemo(() => {
    if (isTyping || isSpeaking) {
      return "speaking";
    }

    if (phase === "opening") {
      return "waiting";
    }

    return "listening";
  }, [isTyping, isSpeaking, phase]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return undefined;
    }

    function syncVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }

    syncVoices();
    window.speechSynthesis.addEventListener("voiceschanged", syncVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", syncVoices);
    };
  }, []);

  useEffect(() => {
    if (!speechEnabled || phase === "opening" || !line || !("speechSynthesis" in window)) {
      return undefined;
    }

    const utterance = new SpeechSynthesisUtterance(line);
    const selectedVoice = chooseHumanVoice(voices);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = 0.82;
    utterance.pitch = 0.92;
    utterance.volume = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [line, phase, speechEnabled, voices]);

  useEffect(() => {
    if (!isTiming) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isTiming]);

  useEffect(() => {
    let blinkTimeout;
    let openTimeout;

    function scheduleBlink() {
      blinkTimeout = window.setTimeout(
        () => {
          setIsBlinking(true);

          openTimeout = window.setTimeout(() => {
            setIsBlinking(false);
            scheduleBlink();
          }, 120);
        },
        Math.floor(Math.random() * 3200) + 1800
      );
    }

    scheduleBlink();

    return () => {
      window.clearTimeout(blinkTimeout);
      window.clearTimeout(openTimeout);
    };
  }, []);

  useEffect(() => {
    if (!ratingFeedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setRatingFeedback(null);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [ratingFeedback]);

  useEffect(() => {
    if (!earningFeedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setEarningFeedback(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [earningFeedback]);

  function beginTask() {
    if (phase === "timing") {
      const isCorrect = elapsedSeconds === targetSeconds;
      setRatingFeedback(isCorrect ? "positive" : "negative");

      setRating((currentRating) => {
        if (isCorrect) {
          return Math.min(currentRating + 1, 5);
        }

        return Math.max(currentRating - 1, 1);
      });

      if (isCorrect) {
        setEarnings((currentEarnings) => currentEarnings + 10);
        setEarningFeedback(true);
      }
    }

    const isFirstTask = taskCount === 0;
    setTargetSeconds(getRandomSeconds(isFirstTask ? 5 : 5, isFirstTask ? 10 : 300));
    setElapsedSeconds(0);
    setTaskCount((currentCount) => currentCount + 1);
    setSpeechEnabled(true);
    setPhase("timing");
  }

  return (
    <main className="timer-room" aria-label="AI agent interaction">
      <video className="sky-video" src={skyLoop} autoPlay muted loop playsInline aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />

      <div className="ritual-frame">
        <div
          className={`rating-display ${ratingFeedback ? `rating-${ratingFeedback}` : ""}`}
          aria-label={`${rating} stars, ${ratingLabels[rating]}`}
        >
          <div className="stars" aria-hidden="true">
            {"★".repeat(rating)}
            <span>{"★".repeat(5 - rating)}</span>
          </div>
          <div className="metric-label">{ratingLabels[rating]}</div>
          {ratingFeedback ? (
            <div className="rating-burst" aria-hidden="true">
              {ratingFeedback === "positive" ? "+ STAR" : "- STAR"}
            </div>
          ) : null}
        </div>

        <div
          className={`earning-display ${earningFeedback ? "earning-positive" : ""}`}
          aria-label={`Earnings ${earnings} dollars`}
        >
          <div className="earning-amount">${earnings}</div>
          <div className="metric-label">earning</div>
          {earningFeedback ? (
            <div className="earning-burst" aria-hidden="true">
              + $10
            </div>
          ) : null}
        </div>

        <svg className="frame-outline" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
          <path className="frame-main" d="M0 34H14L50 0L86 34H100V140H0V34Z" />
          <path className="frame-inner" d="M5 39H17L50 8L83 39H95V135H5V39Z" />
          <path className="frame-echo" d="M20 34L50 6L80 34" />
          <circle className="frame-finial" cx="50" cy="-7" r="3.2" />
          <path className="frame-finial-stem" d="M50 -3.8V0" />
          <path className="frame-ornament" d="M8 34V27H14M92 34V27H86M0 51H7M93 51H100M0 124H8M92 124H100" />
          <path className="frame-base" d="M14 132H38M62 132H86M23 136H77" />
        </svg>

        <section className="encounter" aria-live="polite">
          <div className={`eye-presence ${orbState} ${isBlinking ? "blinking" : ""}`} aria-hidden="true">
            <img className="eyes eyes-open" src={eyesOpen} alt="" />
            <img className="eyes eyes-shut" src={eyesShut} alt="" />
          </div>

          <p className="agent-line">{typedLine}</p>

          {isTiming ? (
            <div className="timer-readout" aria-label={`Elapsed time ${formatTimer(elapsedSeconds)}`}>
              {formatTimer(elapsedSeconds)}
            </div>
          ) : null}
        </section>

        <div className="choices">
          {phase === "opening" ? (
            <button className="ready-button" type="button" onClick={beginTask}>
              I'm ready.
            </button>
          ) : (
            <button className="ready-button time-button" type="button" onClick={beginTask}>
              It's {targetLabel}.
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
