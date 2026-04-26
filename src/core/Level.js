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
    }

    draw(ctx) {
        // วาดพื้นหลัง/เส้น Grid
        ctx.fillStyle = '#111';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'black';

        this.obstacles.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        });

        // วาด Portals
        this.portals.forEach(p => {
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#a855f7';
            ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Portal Label
            ctx.fillStyle = '#a855f7';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, p.x, p.y - 50);
            ctx.restore();
        });
        
        ctx.shadowBlur = 0;
    }

    getRandomSpawnPoint() {
        return this.portals[Math.floor(Math.random() * this.portals.length)];
    }
}