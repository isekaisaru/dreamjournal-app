import confetti from "canvas-confetti";

export const triggerDreamConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // 星と丸を混ぜる
    // 夢っぽい色: 黄色(FFD700), 紫(9370DB), 青(4169E1), ピンク(FF69B4)
    const colors = ["#FFD700", "#9370DB", "#4169E1", "#FF69B4", "#00CED1"];

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: colors,
      shapes: ["star", "circle"],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: colors,
      shapes: ["star", "circle"],
    });
  }, 250);
};
