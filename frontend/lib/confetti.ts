import confetti from "canvas-confetti";

export const triggerDreamConfetti = () => {
  const duration = 800;
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 22,
    spread: 70,
    ticks: 45,
    scalar: 0.9,
    zIndex: 0,
  };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = Math.max(6, Math.round(18 * (timeLeft / duration)));

    const colors = ["#FFD700", "#FFB347", "#7DD3FC"];

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.2, 0.35), y: 0.2 },
      drift: randomInRange(-0.2, 0.2),
      gravity: 0.8,
      colors,
      shapes: ["star"],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.65, 0.8), y: 0.2 },
      drift: randomInRange(-0.2, 0.2),
      gravity: 0.8,
      colors,
      shapes: ["star"],
    });
  }, 250);
};
