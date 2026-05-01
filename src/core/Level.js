// src/core/Level.js

import { CONFIG } from '../config.js';

// 1. ข้อมูลกำแพง (ส่งออกไปให้ Player/Zombie ใช้เช็คชน)
export const OBSTACLES = [
    // ขอบโลก
    { x: -50, y: -50, w: 3100, h: 50 }, 
    { x: -50, y: 3000, w: 3100, h: 50 },
    { x: -50, y: 0, w: 50, h: 3000 },
    { x: 3000, y: 0, w: 50, h: 3000 },

    
    
    // กำแพงบังสายตา
    { x: 500, y: 500, w: 400, h: 50 },
    { x: 500, y: 550, w: 50, h: 300 },
    { x: 2100, y: 2100, w: 400, h: 50 },
    { x: 2450, y: 1800, w: 50, h: 350 },
    
    // เขาวงกต
    { x: 400, y: 2200, w: 20, h: 400 },
    { x: 600, y: 2400, w: 20, h: 400 },
    
    // สิ่งกีดขวางย่อย
    { x: 1800, y: 600, w: 100, h: 100 },
    { x: 1000, y: 1800, w: 150, h: 50 }
];

// 2. ข้อมูลจุดพอร์ทัล (Fixed Spawn Points)
export const PORTALS = [
    { x: 200, y: 200, name: "NORTH WEST" },
    { x: 2800, y: 200, name: "NORTH EAST" },
    { x: 200, y: 2800, name: "SOUTH WEST" },
    { x: 2800, y: 2800, name: "SOUTH EAST" },
    { x: 1500, y: 200, name: "NORTH GATE" },
    { x: 1500, y: 2800, name: "SOUTH GATE" }
];

// 3. Class สำหรับจัดการด่าน (วาด และ สุ่ม)
export class Level {
    constructor() {
        this.obstacles = OBSTACLES;
        this.portals = PORTALS;
        this.isVoidActive = false;
        
        // Attach to window so skills can toggle it easily
        window.levelInstance = this;
    }

    draw(ctx) {
        // --- Base Asphalt (Dark Grey) ---
        ctx.fillStyle = this.isVoidActive ? '#000000' : '#0a0a0c';
        ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        // --- Road Markings (Shibuya Crossing Vibe) ---
        if (!this.isVoidActive) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 2;
            
            // Grid of roads
            for (let i = 0; i < CONFIG.WORLD_WIDTH; i += 500) {
                // Horizontal Roads
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(0, i + 200, CONFIG.WORLD_WIDTH, 100);
                // Vertical Roads
                ctx.fillRect(i + 200, 0, 100, CONFIG.WORLD_HEIGHT);
            }

            // Large Zebra Crossing at Center
            const centerX = CONFIG.WORLD_WIDTH / 2;
            const centerY = CONFIG.WORLD_HEIGHT / 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = -150; i < 150; i += 40) {
                ctx.fillRect(centerX + i, centerY - 100, 20, 200); // Vertical zebra
                ctx.fillRect(centerX - 100, centerY + i, 200, 20); // Horizontal zebra
            }
        }

        // --- Draw Buildings (Obstacles) ---
        this.obstacles.forEach((obs, idx) => {
            ctx.save();
            // Building Body
            ctx.fillStyle = this.isVoidActive ? '#111' : '#111115';
            ctx.shadowBlur = this.isVoidActive ? 0 : 15;
            ctx.shadowColor = this.isVoidActive ? 'transparent' : (idx % 2 === 0 ? '#3b82f6' : '#a855f7');
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            
            // Building Outline (Neon)
            ctx.strokeStyle = this.isVoidActive ? '#fff' : (idx % 2 === 0 ? '#3b82f6' : '#a855f7');
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

            // Windows (Glowing dots)
            if (!this.isVoidActive && obs.w > 40 && obs.h > 40) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 200, 0.3)' : 'rgba(100, 200, 255, 0.2)';
                for (let wx = 10; wx < obs.w - 10; wx += 20) {
                    for (let wy = 10; wy < obs.h - 10; wy += 20) {
                        if ((wx + wy + idx) % 7 < 3) {
                            ctx.fillRect(obs.x + wx, obs.y + wy, 6, 6);
                        }
                    }
                }
            }

            // Neon Signs
            if (!this.isVoidActive && idx % 3 === 0) {
                ctx.fillStyle = idx % 2 === 0 ? '#f87171' : '#4ade80';
                ctx.font = 'bold 10px Arial';
                ctx.fillText("SHIBUYA 109", obs.x + 5, obs.y + 15);
            }
            ctx.restore();
        });

        // --- Portals (Subway Entrances) ---
        this.portals.forEach(p => {
            ctx.save();
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#a855f7';
            
            // Entrance Glow
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 50);
            grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
            grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(p.x, p.y, 50, 0, Math.PI * 2); ctx.fill();

            // Icon
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3;
            ctx.strokeRect(p.x - 20, p.y - 20, 40, 40);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("EXIT", p.x, p.y + 5);
            
            // Label
            ctx.fillStyle = '#a855f7';
            ctx.font = '900 12px "Outfit"';
            ctx.fillText(p.name, p.x, p.y - 35);
            ctx.restore();
        });
        
        ctx.shadowBlur = 0;
    }

    getRandomSpawnPoint() {
        return this.portals[Math.floor(Math.random() * this.portals.length)];
    }
}