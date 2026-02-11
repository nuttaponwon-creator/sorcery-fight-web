export class InputHandler {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
        this.joystick = { x: 0, y: 0, active: false };
        
        // Keyboard
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        
        // Mouse
        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        // Touch Aiming (Touch Move on Canvas)
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('touchmove', e => {
            const t = e.touches[0];
            this.mouse.x = t.clientX;
            this.mouse.y = t.clientY;
            // worldX/Y updated in main loop with camera
        }, {passive: false});

        this.setupJoystick();
    }

    setupJoystick() {
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');

        const handleMove = (e) => {
            e.preventDefault();
            const touch = e.targetTouches[0];
            if (!touch) return;
            
            const rect = zone.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            const dist = Math.hypot(dx, dy);
            const maxR = rect.width / 2;
            
            if (dist > maxR) {
                const angle = Math.atan2(dy, dx);
                dx = Math.cos(angle) * maxR;
                dy = Math.sin(angle) * maxR;
            }
            
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.joystick.x = dx / maxR;
            this.joystick.y = dy / maxR;
            this.joystick.active = true;
        };

        const reset = (e) => {
            e.preventDefault();
            knob.style.transform = `translate(-50%, -50%)`;
            this.joystick.x = 0;
            this.joystick.y = 0;
            this.joystick.active = false;
        };

        zone.addEventListener('touchstart', handleMove, {passive: false});
        zone.addEventListener('touchmove', handleMove, {passive: false});
        zone.addEventListener('touchend', reset);
    }
}

export const input = new InputHandler();