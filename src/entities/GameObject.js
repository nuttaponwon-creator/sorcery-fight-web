// src/entities/GameObject.js

export class GameObject {
    constructor(x = 0, y = 0) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.dead = false;
        this.isLocal = true;
    }

    update() {
        // Base update logic
    }

    draw(ctx) {
        // Base draw logic
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}
