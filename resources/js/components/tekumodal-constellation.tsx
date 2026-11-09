import { useEffect, useRef, useState } from 'react';

const stars: { x: number; y: number; glow: number }[] = [
    { x: 0.18, y: 0.35, glow: 0 },
    { x: 0.32, y: 0.35, glow: 0 },
    { x: 0.25, y: 0.35, glow: 0 },
    { x: 0.25, y: 0.65, glow: 0 },
    { x: 0.46, y: 0.35, glow: 0 },
    { x: 0.37, y: 0.35, glow: 0 },
    { x: 0.37, y: 0.65, glow: 0 },
    { x: 0.46, y: 0.65, glow: 0 },
    { x: 0.37, y: 0.5, glow: 0 },
    { x: 0.44, y: 0.5, glow: 0 },
    { x: 0.51, y: 0.35, glow: 0 },
    { x: 0.51, y: 0.65, glow: 0 },
    { x: 0.51, y: 0.5, glow: 0 },
    { x: 0.6, y: 0.35, glow: 0 },
    { x: 0.6, y: 0.65, glow: 0 },
    { x: 0.65, y: 0.35, glow: 0 },
    { x: 0.65, y: 0.65, glow: 0 },
    { x: 0.75, y: 0.65, glow: 0 },
    { x: 0.75, y: 0.35, glow: 0 },
];

const steps = [
    { from: 0, to: 1, label: '1. T atas kiri ke T atas kanan' },
    { from: 2, to: 3, label: '2. T atas tengah ke T bawah' },
    { from: 4, to: 5, label: '3. E atas kanan ke E atas kiri' },
    { from: 5, to: 6, label: '4. E atas kiri ke E bawah kiri' },
    { from: 6, to: 7, label: '5. E bawah kiri ke E bawah kanan' },
    { from: 8, to: 9, label: '6. E tengah ke E kanan tengah' },
    { from: 10, to: 11, label: '7. K atas ke K bawah' },
    { from: 12, to: 13, label: '8. K tengah ke K kanan atas' },
    { from: 12, to: 14, label: '9. K tengah ke K kanan bawah' },
    { from: 15, to: 16, label: '10. U kiri atas ke U kiri bawah' },
    { from: 16, to: 17, label: '11. U kiri bawah ke U kanan bawah' },
    { from: 17, to: 18, label: '12. U kanan bawah ke U kanan atas' },
];

interface TeKuModalConstellationProps {
    xp: number;
    animateFromXp?: number;
    animationDelayMs?: number;
}

export default function TeKuModalConstellation({ xp, animateFromXp, animationDelayMs = 1500 }: TeKuModalConstellationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const normalizedXp = Math.min(100, Math.max(0, xp));
    const earnedSteps = Math.floor((normalizedXp / 100) * steps.length);
    const initialSteps = animateFromXp === undefined ? earnedSteps : Math.floor((Math.min(100, Math.max(0, animateFromXp)) / 100) * steps.length);
    const [completedSteps, setCompletedSteps] = useState(initialSteps);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const startAt = Math.min(earnedSteps, initialSteps);
        let currentStepIndex = startAt;
        let animationProgress = 0;
        let animating = false;
        let shakeTime = 0;
        let frameId = 0;
        let delayTimer: number | undefined;
        const particles: {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            alpha: number;
            decay: number;
            rotation: number;
            vRot: number;
            isStar: boolean;
        }[] = [];
        const shockwaves: { x: number; y: number; radius: number; alpha: number }[] = [];
        const activeStars = new Set<number>();
        const completedLines = steps.slice(0, startAt);

        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            const scale = window.devicePixelRatio || 1;
            canvas.width = Math.round(rect.width * scale);
            canvas.height = Math.round(rect.height * scale);
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
        };

        const getPos = (star: (typeof stars)[number]) => ({
            x: (star.x * canvas.width) / (window.devicePixelRatio || 1),
            y: (star.y * canvas.height) / (window.devicePixelRatio || 1),
        });

        const drawBoothWalletSilhouette = () => {
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);
            ctx.save();
            const cx = width * 0.5;
            const cy = height * 0.5;
            const scale = Math.min(width * 0.45, height * 0.5);

            ctx.translate(cx, cy);
            ctx.strokeStyle = 'rgba(76, 201, 240, 0.28)';
            ctx.fillStyle = 'rgba(76, 201, 240, 0.03)';
            ctx.shadowColor = '#4cc9f0';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.arc(0, -scale * 0.35, scale * 0.4, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, -scale * 0.38, scale * 0.45, Math.PI * 1.14, Math.PI * 1.86);
            ctx.stroke();

            const numScallops = 6;
            const startX = -scale * 0.42;
            const scallopW = (scale * 0.84) / numScallops;
            const scallopY = -scale * 0.26;
            for (let i = 0; i < numScallops; i++) {
                ctx.beginPath();
                ctx.arc(startX + scallopW * (i + 0.5), scallopY, scallopW * 0.5, 0, Math.PI);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.rect(-scale * 0.38, -scale * 0.26, scale * 0.04, scale * 0.26);
            ctx.rect(-scale * 0.3, -scale * 0.26, scale * 0.04, scale * 0.26);
            ctx.rect(scale * 0.26, -scale * 0.26, scale * 0.04, scale * 0.26);
            ctx.rect(scale * 0.34, -scale * 0.26, scale * 0.04, scale * 0.26);
            ctx.stroke();

            ctx.beginPath();
            ctx.rect(-scale * 0.4, 0, scale * 0.8, scale * 0.07);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.roundRect(-scale * 0.44, scale * 0.07, scale * 0.88, scale * 0.38, [16]);
            ctx.fill();
            ctx.stroke();

            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(76, 201, 240, 0.2)';
            ctx.beginPath();
            ctx.roundRect(-scale * 0.42, scale * 0.09, scale * 0.84, scale * 0.34, [12]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = 'rgba(76, 201, 240, 0.28)';
            ctx.beginPath();
            ctx.rect(-scale * 0.38, scale * 0.2, scale * 0.34, scale * 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-scale * 0.35, scale * 0.24);
            ctx.lineTo(-scale * 0.08, scale * 0.24);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-scale * 0.33, scale * 0.26, scale * 0.015, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.roundRect(scale * 0.24, scale * 0.18, scale * 0.18, scale * 0.12, [8]);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(scale * 0.33, scale * 0.24, scale * 0.025, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        };

        const triggerExplosion = (x: number, y: number) => {
            shakeTime = 14;
            shockwaves.push({ x, y, radius: 4, alpha: 1 });
            const colors = ['#ffffff', '#4cc9f0', '#4895ef', '#7209b7', '#f72585', '#70e000', '#ffd166'];
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 4 + Math.random() * 10;
                particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2 + Math.random() * 5.5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: 1,
                    decay: 0.015 + Math.random() * 0.02,
                    rotation: Math.random() * Math.PI * 2,
                    vRot: (Math.random() - 0.5) * 0.25,
                    isStar: Math.random() > 0.45,
                });
            }
        };

        const drawStarNode = (
            cx: number,
            cy: number,
            spikes: number,
            outerRadius: number,
            innerRadius: number,
            color: string,
            shadowColor: string | null,
        ) => {
            let rotation = (Math.PI / 2) * 3;
            const angleStep = Math.PI / spikes;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                let x = cx + Math.cos(rotation) * outerRadius;
                let y = cy + Math.sin(rotation) * outerRadius;
                ctx.lineTo(x, y);
                rotation += angleStep;
                x = cx + Math.cos(rotation) * innerRadius;
                y = cy + Math.sin(rotation) * innerRadius;
                ctx.lineTo(x, y);
                rotation += angleStep;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
            ctx.fillStyle = color;
            if (shadowColor) {
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = 18;
            }
            ctx.fill();
            ctx.restore();
        };

        const draw = () => {
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);
            ctx.save();
            if (shakeTime > 0) {
                shakeTime--;
                ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
            }

            ctx.clearRect(0, 0, width, height);
            drawBoothWalletSilhouette();

            completedLines.forEach((line) => {
                const p1 = getPos(stars[line.from]);
                const p2 = getPos(stars[line.to]);
                activeStars.add(line.from);
                activeStars.add(line.to);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = 'rgba(156, 217, 255, 0.85)';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#4cc9f0';
                ctx.shadowBlur = 16;
                ctx.stroke();
                ctx.shadowBlur = 0;
            });

            if (animating && currentStepIndex >= 0) {
                const step = steps[currentStepIndex];
                const p1 = getPos(stars[step.from]);
                const p2 = getPos(stars[step.to]);
                const currentX = p1.x + (p2.x - p1.x) * animationProgress;
                const currentY = p1.y + (p2.y - p1.y) * animationProgress;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(currentX, currentY);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#4cc9f0';
                ctx.shadowBlur = 22;
                ctx.stroke();
                ctx.shadowBlur = 0;
                drawStarNode(currentX, currentY, 4, 8, 3, '#ffffff', '#4cc9f0');
            }

            shockwaves.forEach((wave, index) => {
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(76, 201, 240, ${wave.alpha})`;
                ctx.lineWidth = 4;
                ctx.shadowColor = '#4cc9f0';
                ctx.shadowBlur = 22;
                ctx.stroke();
                ctx.shadowBlur = 0;
                wave.radius += 3.8;
                wave.alpha -= 0.022;
                if (wave.alpha <= 0) shockwaves.splice(index, 1);
            });

            particles.forEach((particle, index) => {
                ctx.save();
                ctx.globalAlpha = particle.alpha;
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                if (particle.isStar) {
                    drawStarNode(0, 0, 4, particle.size * 1.5, particle.size * 0.6, particle.color, particle.color);
                } else {
                    ctx.fillStyle = particle.color;
                    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
                }
                ctx.restore();
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.09;
                particle.rotation += particle.vRot;
                particle.alpha -= particle.decay;
                if (particle.alpha <= 0) particles.splice(index, 1);
            });

            stars.forEach((star, index) => {
                const pos = getPos(star);
                if (activeStars.has(index)) {
                    star.glow += 0.05;
                    const outerRadius = 10 + Math.sin(star.glow) * 2;
                    const innerRadius = 4 + Math.sin(star.glow);
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, outerRadius + 8, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(76, 201, 240, 0.25)';
                    ctx.fill();
                    drawStarNode(pos.x, pos.y, 4, outerRadius, innerRadius, '#ffffff', '#4cc9f0');
                } else {
                    drawStarNode(pos.x, pos.y, 4, 5, 2, 'rgba(255, 255, 255, 0.35)', null);
                }
            });

            if (animating) {
                animationProgress += 0.025;
                if (animationProgress >= 1) {
                    animationProgress = 0;
                    animating = false;
                    const step = steps[currentStepIndex];
                    activeStars.add(step.from);
                    activeStars.add(step.to);
                    completedLines.push(step);
                    const targetPos = getPos(stars[step.to]);
                    triggerExplosion(targetPos.x, targetPos.y);
                    setCompletedSteps(completedLines.length);
                    currentStepIndex++;
                    if (currentStepIndex < earnedSteps) animating = true;
                }
            }

            ctx.restore();
            frameId = window.requestAnimationFrame(draw);
        };

        resizeCanvas();
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvas);

        setCompletedSteps(startAt);
        if (animateFromXp !== undefined && startAt < earnedSteps) {
            animating = false;
            delayTimer = window.setTimeout(() => {
                animating = true;
            }, animationDelayMs);
        }

        draw();
        return () => {
            resizeObserver.disconnect();
            window.cancelAnimationFrame(frameId);
            if (delayTimer !== undefined) window.clearTimeout(delayTimer);
        };
    }, [animateFromXp, animationDelayMs, earnedSteps, initialSteps]);

    return (
        <div
            aria-label="Konstelasi TEKU"
            className="relative w-full overflow-hidden select-none"
            style={{
                height: 'clamp(240px, 32vh, 320px)',
                minHeight: 240,
                background: 'radial-gradient(circle at center, #0d1b2a 0%, #010811 100%)',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                userSelect: 'none',
            }}
        >
            <canvas aria-hidden="true" className="absolute inset-0 z-[1] h-full w-full" ref={canvasRef} />
            <p className="sr-only" role="status" aria-live="polite">
                Konstelasi TEKU: {completedSteps} dari 12 koneksi terbuka berdasarkan {normalizedXp} XP.
            </p>
        </div>
    );
}
