// src/core/UIManager.js

export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.initElements();
    }

    initElements() {
        this.menu = document.getElementById('setup-menu');
        this.healthBar = document.getElementById('health-bar-fill');
        this.hpFill = this.healthBar;
        this.scoreDisplay = document.getElementById('score-display');
        this.waveDisplay = document.getElementById('wave-display');
        this.leaderList = document.getElementById('leader-list');
        this.chatMessages = document.getElementById('chat-messages');
        this.spectatorOverlay = document.getElementById('spectator-overlay');
        this.spectatorTargetName = document.getElementById('spectator-target');
        this.skillsHud = document.getElementById('skills-hud');
        this.setupMenu = document.getElementById('setup-menu');
        this.setupMenuContent = document.getElementById('setup-menu-content');
        this.readySection = document.getElementById('ready-section');
        
        // Rika UI
        this.rikaGaugeContainer = document.getElementById('rika-gauge-container');
        this.rikaGaugeBar = document.getElementById('rika-gauge-bar');
        
        // Toji UI
        this.tojiHoldContainer = document.getElementById('toji-hold-container');
        this.tojiHoldBar = document.getElementById('toji-hold-bar');

        // Sukuna UI (Integrated into generic gauges or kept separate)
        this.sukunaDomainContainer = document.getElementById('sukuna-domain-container');
        this.sukunaDomainBar = document.getElementById('sukuna-domain-bar');

        // Wave Clear / Boss Clear overlays
        this.waveClearOverlay = document.getElementById('wave-clear-overlay');
        this.waveClearLabel = document.getElementById('wave-clear-label');
        this.waveNextLabel = document.getElementById('wave-next-label');
        this.bossClearOverlay = document.getElementById('boss-clear-overlay');
        this.bossClearLabel = document.getElementById('boss-clear-label');
        this.bossWaveLabel = document.getElementById('boss-wave-label');
        this._waveClearTimer = null;
        this._bossClearTimer = null;
        
        // Skill Icons and Overlays
        this.icons = {
            q: document.getElementById('skill-q'),
            e: document.getElementById('skill-e'),
            r: document.getElementById('skill-r'),
            space: document.getElementById('skill-ult') // Changed key from 'ult' to 'space'
        };
        this.overlays = {
            q: document.getElementById('cooldown-q'),
            e: document.getElementById('cooldown-e'),
            r: document.getElementById('cooldown-r'),
            space: document.getElementById('cooldown-ult') // Changed key from 'ult' to 'space'
        };
        this.cdTexts = {
            q: document.getElementById('cd-text-q'),
            e: document.getElementById('cd-text-e'),
            r: document.getElementById('cd-text-r'),
            space: document.getElementById('cd-text-space')
        };
    }

    updateSkillIcons(type) {
        const icons = {
            gojo: { q: '🔵', e: '🔴', r: '🟣', space: '♾️', classes: ['icon-blue', 'icon-red', 'icon-purple', 'icon-void'] },
            sukuna: { q: '🔪', e: '🩸', r: '🔥', space: '⛩️', classes: ['icon-sukuna-q', 'icon-sukuna-e', 'icon-sukuna-r', 'icon-sukuna-space'] },
            toji: { q: '🗡️', e: '🐛', r: '⚔️', space: '💢', classes: ['icon-toji-q', 'icon-toji-e', 'icon-toji-r', 'icon-toji-space'] },
            yuta: { q: '⚔️', e: '🐾', r: '📢', space: '👑', classes: ['icon-yuta-q', 'icon-yuta-e', 'icon-yuta-r', 'icon-yuta-space'] }
        };
        const set = icons[type] || icons.gojo;
        
        // Update Text/Emoji
        if (this.icons.q) this.icons.q.querySelector('.skill-display-text') ? this.icons.q.querySelector('.skill-display-text').innerText = set.q : this.icons.q.innerText = set.q;
        if (this.icons.e) this.icons.e.querySelector('.skill-display-text') ? this.icons.e.querySelector('.skill-display-text').innerText = set.e : this.icons.e.innerText = set.e;
        if (this.icons.r) this.icons.r.querySelector('.skill-display-text') ? this.icons.r.querySelector('.skill-display-text').innerText = set.r : this.icons.r.innerText = set.r;
        if (this.icons.space) this.icons.space.querySelector('.skill-display-text') ? this.icons.space.querySelector('.skill-display-text').innerText = set.space : this.icons.space.innerText = set.space;

        // Update CSS Classes for premium styles
        const slots = ['q', 'e', 'r', 'space'];
        slots.forEach((s, idx) => {
            const el = this.icons[s];
            if (el) {
                // Keep base classes but replace character specific ones
                const baseClasses = ['skill-slot', 'skill-icon-anim'];
                el.className = baseClasses.join(' ') + ' ' + (el.classList.contains('ready') ? 'ready' : '') + ' ' + set.classes[idx];
            }
        });
    }

    updateUI() {
        if (!this.gameState.player) return;

        // HP Bar
        const hpPercent = (this.gameState.player.health / this.gameState.player.maxHealth) * 100;
        if (this.hpFill) this.hpFill.style.width = `${Math.max(0, hpPercent)}%`;

        // Score
        if (this.scoreDisplay) this.scoreDisplay.innerText = Math.floor(this.gameState.score);

        // Cooldowns
        const p = this.gameState.player;
        const skills = ['q', 'e', 'r', 'space'];
        const pSkills = ['q', 'e', 'r', 'space'];

        skills.forEach((s, idx) => {
            const cdKey = pSkills[idx];
            const currentCd = p.cd[cdKey];
            const maxCd = p.maxCd[cdKey] || 1;
            const percent = (currentCd / maxCd) * 100;

            if (this.overlays[s]) this.overlays[s].style.height = `${percent}%`;
            
            // Ready status visual feedback
            if (this.icons[s]) {
                if (currentCd <= 0) {
                    this.icons[s].classList.add('ready');
                    this.icons[s].classList.add('ready-pulse');
                } else {
                    this.icons[s].classList.remove('ready');
                    this.icons[s].classList.remove('ready-pulse');
                }
            }
        });

        // Update Stats
        this.scoreDisplay.innerText = this.gameState.score;
        this.waveDisplay.innerText = this.gameState.wave;

        // Skill Icons & Cooldowns
        if (this.gameState.active) {
            this.menu.classList.add('hidden');
            this.skillsHud.classList.remove('hidden');
            // Only update icons when character type changes (performance fix)
            if (p.type !== this._lastIconType) {
                this.updateSkillIcons(p.type);
                this._lastIconType = p.type;
            }
            this.updateCooldowns(p);

            // Rika Gauge Logic
            if (p.type === 'yuta' && this.rikaGaugeContainer) {
                this.rikaGaugeContainer.classList.remove('hidden');
                const gaugeVal = Math.floor(p.rikaGauge || 0);
                if (this.rikaGaugeBar) this.rikaGaugeBar.style.width = `${gaugeVal}%`;
            } else if (this.rikaGaugeContainer) {
                this.rikaGaugeContainer.classList.add('hidden');
            }

            // Toji UI Logic
            if (p.type === 'toji' && this.tojiHoldContainer) {
                this.tojiHoldContainer.classList.remove('hidden');
                const holdProgress = Math.min(1, (p.holdQTimer || 0) / 120); 
                const percent = Math.floor(holdProgress * 100);
                if (this.tojiHoldBar) this.tojiHoldBar.style.width = `${percent}%`;
            } else if (this.tojiHoldContainer) {
                this.tojiHoldContainer.classList.add('hidden');
            }

            // Sukuna UI Logic
            if (p.type === 'sukuna' && this.sukunaDomainContainer) {
                this.sukunaDomainContainer.classList.remove('hidden');
                const shrineVal = Math.min(100, Math.floor(p.shrineGauge || 0));
                if (this.sukunaDomainBar) this.sukunaDomainBar.style.width = `${shrineVal}%`;
            } else if (this.sukunaDomainContainer) {
                this.sukunaDomainContainer.classList.add('hidden');
            }

        } else {
            this.menu.classList.remove('hidden');
            this.skillsHud.classList.add('hidden');
            if (this.rikaGaugeContainer) this.rikaGaugeContainer.classList.add('hidden');
            if (this.tojiHoldContainer) this.tojiHoldContainer.classList.add('hidden');
            if (this.sukunaDomainContainer) this.sukunaDomainContainer.classList.add('hidden');
        }

        // Death Check
        if (p.health <= 0 || this.gameState.isSpectating) {
            this.showDeathScreen();
        } else {
            this.spectatorOverlay.classList.add('hidden');
        }
    }

    // updateSkillIcons merged into the first definition

    updateCooldowns(p) {
        const slots = ['q', 'e', 'r', 'space'];
        slots.forEach(s => {
            const current = p.cd[s];
            const max = p.maxCd[s];
            const percent = (current / max) * 100;
            this.overlays[s].style.height = `${Math.max(0, percent)}%`;
            
            // แสดงตัวเลขคูลดาวน์ (วินาที)
            if (this.cdTexts[s]) {
                if (current > 0) {
                    const seconds = (current / 60).toFixed(1);
                    this.cdTexts[s].innerText = seconds;
                } else {
                    this.cdTexts[s].innerText = '';
                }
            }
        });
    }

    addChatMessage(name, msg) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${name}:</strong> ${msg}`;
        this.chatMessages.appendChild(p);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    updateLeaderboard(players) {
        if (!this.leaderList) return;
        this.leaderList.innerHTML = players
            .sort((a,b) => b.score - a.score)
            .map(p => `<li>${p.name}: ${p.score}</li>`)
            .join('');
    }

    showDeathScreen() {
        if (!this.spectatorOverlay) return;
        this.spectatorOverlay.classList.remove('hidden');
        const hint = this.spectatorOverlay.querySelector('.spectator-hint');
        if (hint && !hint.querySelector('button')) {
            hint.innerHTML = `
                YOU ARE DECEASED.<br>
                <button onclick="location.reload()" class="interactive mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg border-2 border-white/20 transition-all shadow-lg shadow-purple-500/50">
                    BACK TO LOBBY
                </button>
            `;
        }
    }

    showSpectator(targetName) {
        if (!this.spectatorOverlay) return;
        this.spectatorOverlay.classList.remove('hidden');
        if (this.spectatorTargetName) this.spectatorTargetName.innerText = targetName.toUpperCase();
    }

    showWaveClear(clearedWave, nextWave) {
        if (!this.waveClearOverlay) return;
        // Update text
        if (this.waveClearLabel) this.waveClearLabel.innerText = `WAVE ${clearedWave} CLEARED`;
        if (this.waveNextLabel) this.waveNextLabel.innerText = `WAVE ${nextWave} INCOMING...`;

        // Re-trigger animation by removing and re-adding
        this.waveClearOverlay.classList.remove('hidden');
        const inner = document.getElementById('wave-clear-text');
        if (inner) { inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = ''; }

        // Auto-hide after 3 seconds
        if (this._waveClearTimer) clearTimeout(this._waveClearTimer);
        this._waveClearTimer = setTimeout(() => {
            this.waveClearOverlay.classList.add('hidden');
        }, 3000);
    }

    showBossClear(wave) {
        if (!this.bossClearOverlay) return;
        if (this.bossWaveLabel) this.bossWaveLabel.innerText = `WAVE ${wave} COMPLETE`;

        this.bossClearOverlay.classList.remove('hidden');
        if (this._bossClearTimer) clearTimeout(this._bossClearTimer);
        this._bossClearTimer = setTimeout(() => {
            this.bossClearOverlay.classList.add('hidden');
        }, 3500);
    }

    // ─── PVP UI Methods ───────────────────────────────────────────────────────

    setMode(mode) {
        const pvpScoreHud = document.getElementById('pvp-score-hud');
        const killFeed = document.getElementById('kill-feed');
        if (mode === 'pvp') {
            if (pvpScoreHud) pvpScoreHud.classList.remove('hidden');
            if (killFeed) killFeed.classList.remove('hidden');
        } else {
            if (pvpScoreHud) pvpScoreHud.classList.add('hidden');
            if (killFeed) killFeed.classList.add('hidden');
        }
    }

    showKillFeed(killerName, victimName, isLocalKiller = false) {
        const feed = document.getElementById('kill-feed');
        if (!feed) return;
        const item = document.createElement('div');
        item.className = 'kill-feed-item';
        const killerColor = isLocalKiller ? '#4ade80' : '#f87171';
        item.innerHTML = `<span style="color:${killerColor}">${killerName}</span> <span style="color:#9ca3af">eliminated</span> <span style="color:#fbbf24">${victimName}</span>`;
        feed.appendChild(item);
        // Auto-remove after 4 seconds
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transition = 'opacity 0.5s';
            setTimeout(() => item.remove(), 500);
        }, 4000);
        // Limit to 6 items
        while (feed.children.length > 6) feed.removeChild(feed.firstChild);
    }

    showKillFeedLocal(msg) {
        const feed = document.getElementById('kill-feed');
        if (!feed) return;
        const item = document.createElement('div');
        item.className = 'kill-feed-item';
        item.style.borderColor = 'rgba(74,222,128,0.5)';
        item.innerHTML = `<span style="color:#4ade80; font-size:14px;">${msg}</span>`;
        feed.appendChild(item);
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transition = 'opacity 0.5s';
            setTimeout(() => item.remove(), 500);
        }, 3000);
        while (feed.children.length > 6) feed.removeChild(feed.firstChild);
    }

    updatePvpScores(scores) {
        const list = document.getElementById('pvp-score-list');
        const roundLabel = document.getElementById('pvp-round-label');
        if (!list || !scores) return;
        const maxKills = Math.max(...scores.map(s => s.pvpKills), 0);
        list.innerHTML = scores.map(p => {
            const isLeading = p.pvpKills === maxKills && maxKills > 0;
            const isDead = p.isDead;
            const cls = `pvp-score-card${isDead ? ' dead' : ''}${isLeading ? ' leading' : ''}`;
            return `<div class="${cls}">
                <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">${p.name}</div>
                <div style="font-size:20px;color:${isLeading ? '#facc15' : 'white'}">${p.pvpKills} <span style="font-size:10px;color:#6b7280">/ 5</span></div>
                ${isDead ? '<div style="font-size:10px;color:#ef4444;">✖ DEAD</div>' : ''}
            </div>`;
        }).join('');
    }

    showPvpRoundStart(round, killsToWin) {
        const banner = document.getElementById('pvp-round-banner');
        const title = document.getElementById('pvp-banner-title');
        const desc = document.getElementById('pvp-banner-desc');
        const inner = document.getElementById('pvp-banner-inner');
        if (!banner) return;
        if (title) title.innerText = `ROUND ${round}`;
        if (desc) desc.innerText = `FIRST TO ${killsToWin} KILLS WINS`;
        banner.classList.remove('hidden');
        if (inner) { inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = ''; }
        // Update round label in HUD
        const roundLabel = document.getElementById('pvp-round-label');
        if (roundLabel) roundLabel.innerText = `ROUND ${round}`;
        setTimeout(() => banner.classList.add('hidden'), 2500);
        // Hide winner banner
        const winnerBanner = document.getElementById('pvp-winner-banner');
        if (winnerBanner) winnerBanner.classList.add('hidden');
    }

    showPvpRoundEnd(winnerName, round, scores) {
        const banner = document.getElementById('pvp-winner-banner');
        const nameEl = document.getElementById('pvp-winner-name');
        const scoresEl = document.getElementById('pvp-winner-scores');
        if (!banner) return;
        if (nameEl) nameEl.innerText = winnerName.toUpperCase();
        if (scoresEl && scores) {
            scoresEl.innerHTML = scores.map(p =>
                `<div style="color:${p.name === winnerName ? '#facc15' : 'white'};font-size:16px;font-weight:bold;">
                    ${p.name === winnerName ? '🏆 ' : ''}${p.name}: ${p.pvpKills} kill${p.pvpKills !== 1 ? 's' : ''}
                </div>`
            ).join('');
        }
        banner.classList.remove('hidden');
    }
}

