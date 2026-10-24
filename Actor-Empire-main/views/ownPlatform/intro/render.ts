const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - x, 3);
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x: number) => {
    const c1 = 1.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
};
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const T = {
    s1: [0, 3.2],
    s2: [3.2, 8.6],
    s3: [8.6, 12.8],
    s4: [12.8, 20.0],
    s5: [20.0, 25.6],
    s6: [25.6, 1e9],
};
const SEGS: [number, number][] = [T.s1 as [number, number], T.s2 as [number, number], T.s3 as [number, number], T.s4 as [number, number], T.s5 as [number, number], [25.6, 27.2]];
const CAPS = ['01 · Cold open', '02 · The incumbents', '03 · The ident', '04 · The job', '05 · Day 0', '06 · Your move'];

const el = (root: ParentNode, sel: string) => root.querySelector(sel) as HTMLElement | null;

const setOp = (node: HTMLElement | null, opacity: number) => {
    if (!node) return;
    node.style.opacity = String(opacity);
    node.classList.toggle('on', opacity > 0.5);
};

const layerOp = (t: number, range: number[], fi = 0.35, fo = 0.35) =>
    Math.min(P(t, range[0], range[0] + fi), 1 - P(t, range[1] - fo, range[1]));

/** Paints one frame. Returns true once the hand-off wipe has finished. */
export const renderIntro = (root: HTMLElement, t: number, handoffAt: number, money: number) => {
    const m = root.clientWidth <= 760;
    const fr = Math.floor(t * 24);
    const grain = el(root, '#grain');
    if (grain) grain.style.transform = `translate(${(hash(fr) * 100 - 50) | 0}px,${(hash(fr + 9) * 100 - 50) | 0}px)`;

    const segs = [...root.querySelectorAll('#segs b')] as HTMLElement[];
    SEGS.forEach((span, index) => {
        if (segs[index]) segs[index].style.width = `${P(t, span[0], span[1]) * 100}%`;
    });
    let scene = 0;
    [T.s1, T.s2, T.s3, T.s4, T.s5, T.s6].forEach((span, index) => { if (t >= span[0]) scene = index; });
    const cap = el(root, '#cap');
    if (cap) cap.textContent = CAPS[scene];

    const s1 = el(root, '#s1');
    setOp(s1, layerOp(t, T.s1, 0.2, 0.4));
    const flicker = t < 1.2 ? (hash(fr * 3) > 0.55 ? 1 : 0.15) * P(t, 0.1, 0.3) : 1;
    const beam = el(root, '#s1 .beam');
    if (beam) {
        beam.style.opacity = String((t < 1.4 ? flicker : lerp(1, 0, P(t, 1.4, 2))) * 0.9);
        beam.style.transform = `scaleX(${eo(P(t, 0, 0.9))})`;
    }
    const punch = P(t, 0.9, 1.6);
    const big = el(root, '#s1big');
    if (big) {
        big.style.opacity = String(punch * (t < 1.8 ? (hash(fr * 7) > 0.2 ? 1 : 0.4) : 1));
        big.style.transform = `scale(${lerp(1.08, 1, eo(punch)) + P(t, 1.6, 3.2) * 0.03})`;
        big.style.letterSpacing = `${lerp(0.06, -0.01, eo(punch))}em`;
    }
    const sub = el(root, '#s1sub');
    if (sub) sub.style.opacity = String(P(t, 1.8, 2.3));
    const week = el(root, '.wk');
    if (week) week.style.opacity = String(P(t, 0.5, 0.9));

    let wallOpacity = Math.min(P(t, 3.2, 3.5), 1 - P(t, 12.6, 12.9));
    if (t >= 25.6) wallOpacity = 0;
    setOp(el(root, '#s2'), wallOpacity);
    const w2 = t - 3.2;
    const wall = el(root, '#wall');
    const tiles = wall ? [...wall.children] as HTMLElement[] : [];
    tiles.forEach((tile, index) => {
        const k = eo(P(w2, 0.25 + index * 0.11, 0.85 + index * 0.11));
        tile.style.opacity = String(k);
        tile.style.transform = `translateY(${(1 - k) * (m ? 14 : 30)}px) scale(${lerp(0.96, 1, k)})`;
        tile.style.filter = `blur(${(1 - k) * 6}px)`;
    });
    let total = 0;
    tiles.forEach(tile => {
        const counter = tile.querySelector('.c');
        if (!counter) return;
        const homes = Number(tile.dataset.homes || 0);
        const index = Number(tile.dataset.i || 0);
        const shown = homes * 1e6 * eo(P(w2, 0.4 + index * 0.11, 1.6 + index * 0.11)) + Math.max(0, w2 - 1.6) * homes * 913;
        counter.textContent = fmt(shown);
        total += shown;
    });
    const tot = el(root, '#tot');
    if (tot) tot.textContent = fmt(total);
    if (wall) {
        const zoom = 1 + P(t, 3.2, 8.6) * 0.025;
        wall.style.transform = (m ? '' : 'translateX(-50%) ') + `scale(${zoom})`;
    }
    const dim = P(t, 8.6, 9.0) * (1 - P(t, 10.4, 11.2) * 0.65);
    tiles.forEach((tile, index) => {
        if (index < 11) tile.style.filter += ` grayscale(${dim}) brightness(${1 - dim * 0.6})`;
    });
    const head = el(root, '#wallHead');
    if (head) head.style.opacity = String(1 - P(t, 8.6, 9.0));
    const slot = el(root, '#slot');
    if (slot) slot.style.opacity = String(Math.min(Number(slot.style.opacity || 1), 1 - P(t, 10.4, 10.6)));

    setOp(el(root, '#s3'), Math.min(P(t, 11.0, 11.4), 1 - P(t, 12.6, 12.9)));
    const s3head = el(root, '#s3head');
    if (s3head) s3head.style.transform = (m ? '' : 'translateX(-50%) ') + `translateY(${(1 - eo(P(t, 11, 11.5))) * 20}px)`;
    const strike = el(root, '#strike');
    const strikePath = root.querySelector('#strikeP') as SVGPathElement | null;
    if (strikePath) {
        strikePath.style.strokeDasharray = '1100';
        const sk = P(t, 9.0, 9.3);
        if (strike) strike.style.opacity = t > 9 && t < 9.75 ? String(1 - P(t, 9.45, 9.75)) : '0';
        strikePath.style.strokeDashoffset = String(1100 * (1 - sk));
    }
    const flash = el(root, '#flash');
    if (flash) flash.style.opacity = t < 9.2 ? '0' : String(Math.max(0, 0.75 - P(t, 9.25, 9.9) * 0.75));

    const you = el(root, '#you');
    if (you && slot) {
        const yo = t < 9.25 ? 0 : (t < 12.7 ? 1 : 1 - P(t, 12.7, 12.9));
        you.style.opacity = String(yo);
        const slotBox = slot.getBoundingClientRect();
        const stageBox = root.getBoundingClientRect();
        const bw = m ? 340 : 620;
        const bh = m ? 200 : 320;
        const bx = (root.clientWidth - bw) / 2;
        const by = (root.clientHeight - bh) / 2 + (m ? 10 : 30);
        const dk = eio(P(t, 10.4, 11.2));
        const appear = back(P(t, 9.25, 9.8));
        const scale = lerp(1.35, 1, appear);
        const x = lerp(bx, slotBox.left - stageBox.left, dk);
        const y = lerp(by, slotBox.top - stageBox.top, dk);
        const w = lerp(bw, slotBox.width, dk);
        const h = lerp(bh, slotBox.height, dk);
        Object.assign(you.style, {
            left: `${x}px`,
            top: `${y}px`,
            width: `${w}px`,
            height: `${h}px`,
            transform: `scale(${dk > 0 ? 1 : scale})`,
        });
        const bigFace = you.querySelector('.big') as HTMLElement | null;
        const smallFace = you.querySelector('.sm') as HTMLElement | null;
        if (bigFace) bigFace.style.opacity = String(1 - P(dk, 0, 0.45));
        if (smallFace) smallFace.style.opacity = String(P(dk, 0.55, 1));
        const typed = you.querySelector('#ytype');
        const caret = el(you, '#ycur');
        const name = 'YOUR NAME HERE+';
        if (typed) typed.textContent = name.slice(0, Math.floor(name.length * P(t, 9.5, 10.3)));
        if (caret) caret.style.opacity = Math.floor(t * 2.5) % 2 ? '1' : '0';
        const glow = t > 11.2 ? 0.5 + 0.5 * Math.sin((t - 11.2) * 5) : 0;
        you.style.boxShadow = `0 0 0 1px #8B7BFF,0 ${lerp(20, 6, dk)}px ${lerp(80, 30, dk) + glow * 30}px #4F3BFF${dk > 0 ? 'aa' : '66'}`;
    }

    const o4 = layerOp(t, T.s4, 0.35, 0.35);
    setOp(el(root, '#s4'), o4);
    const w4 = t - 12.8;
    const per = 1.12;
    const current = clamp(Math.floor((w4 - 0.3) / per), 0, 5);
    const counter = el(root, '#s4ctr');
    if (counter) counter.textContent = `${String(current + 1).padStart(2, '0')} / 06`;
    const cards = el(root, '#cards');
    const cardEls = cards ? [...cards.children] as HTMLElement[] : [];
    cardEls.forEach((card, index) => {
        const start = 0.3 + index * per;
        const k = P(w4, start, start + 0.35);
        const live = P(w4, start + 0.2, start + per + 0.4);
        card.style.opacity = String(eo(k));
        const active = w4 >= start && (index === 5 || w4 < start + per);
        card.style.borderColor = active ? '#4F3BFF' : '#1E2233';
        card.style.boxShadow = active ? '0 0 0 1px #4F3BFF,0 20px 60px #4F3BFF33' : 'none';
        const ok = card.querySelector('.ok') as HTMLElement | null;
        if (ok) ok.style.opacity = String(P(w4, start + per * 0.8, start + per));
        const full = card.querySelector('.full') as HTMLElement | null;
        const mini = card.querySelector('.mini') as HTMLElement | null;
        if (m && full && mini) {
            const done = w4 > start + per && index !== 5;
            const collapse = done ? eio(P(w4, start + per, start + per + 0.3)) : 0;
            card.style.height = w4 < start ? '0px' : `${lerp(266, 46, collapse)}px`;
            card.style.marginBottom = w4 < start ? '0px' : '8px';
            full.style.opacity = String(1 - collapse);
            mini.style.opacity = String(collapse);
            card.style.transform = `translateY(${(1 - eo(k)) * 30}px)`;
        } else if (full && mini) {
            card.style.height = '';
            card.style.marginBottom = '';
            full.style.opacity = '1';
            mini.style.opacity = '0';
            card.style.transform = `scale(${lerp(1.12, 1, back(k))}) rotate(${(1 - eo(k)) * (index % 2 ? 2 : -2)}deg)`;
        }
        const viz = card.querySelector('.viz');
        if (!viz) return;
        if (index === 0) {
            viz.querySelectorAll('i').forEach((dot, j) => {
                const on = hash(j * 3.3) < 0.42;
                const kk = P(live, hash(j) * 0.7, hash(j) * 0.7 + 0.1);
                const node = dot as HTMLElement;
                node.style.background = on && kk > 0 ? `rgba(79,59,255,${0.35 + 0.65 * kk})` : '#ffffff14';
                node.style.boxShadow = on && kk > 0.9 ? '0 0 8px #4F3BFF' : 'none';
            });
        }
        if (index === 1) {
            viz.querySelectorAll('.col').forEach((column, ci) => {
                const count = [16, 11, 6][ci];
                column.querySelectorAll('i').forEach((cell, j) => {
                    (cell as HTMLElement).style.background = j < Math.floor(count * eo(live)) ? ['#8B7BFF', '#4F3BFF', '#C9F2FF'][ci] : '#ffffff12';
                });
            });
        }
        if (index === 2) {
            const stamp = viz.querySelector('.gstamp') as HTMLElement | null;
            if (stamp) {
                const gk = P(live, 0.35, 0.5);
                stamp.style.opacity = String(gk);
                stamp.style.transform = `rotate(-10deg) scale(${lerp(2.2, 1, eo(gk))})`;
            }
        }
        if (index === 3) {
            const books = viz.querySelector('.bn');
            if (books) books.textContent = fmt(3042 * eo(live));
            viz.querySelectorAll('.spines i').forEach((spine, j) => {
                (spine as HTMLElement).style.height = `${(30 + hash(j + 2) * 70) * eo(P(live, j * 0.02, j * 0.02 + 0.3))}%`;
            });
        }
        if (index === 4) {
            const me = viz.querySelector('.me') as HTMLElement | null;
            if (me) {
                const climb = eio(P(live, 0.1, 0.8));
                me.style.top = `${lerp(m ? 84 : 96, 0, climb)}px`;
                const rank = Math.round(lerp(41, 5, climb));
                const label = me.querySelector('.mr');
                if (label) label.textContent = `#${String(rank).padStart(2, '0')} · You`;
            }
        }
        if (index === 5) {
            const spark = viz.querySelector('.sp') as SVGPathElement | null;
            if (spark) {
                spark.style.strokeDasharray = '400';
                spark.style.strokeDashoffset = String(400 * (1 - eo(live)));
            }
            const tick = viz.querySelector('.tk');
            if (tick) tick.innerHTML = `EMP ▲ ${(18.4 * eo(live)).toFixed(1)}%`;
        }
    });

    setOp(el(root, '#s5'), layerOp(t, T.s5, 0.35, 0.4));
    const w5 = t - 20;
    const s5head = el(root, '#s5head');
    if (s5head) s5head.style.transform = (m ? '' : 'translateX(-50%) ') + `translateY(${(1 - eo(P(w5, 0, 0.5))) * 20}px)`;
    const cert = el(root, '#cert');
    if (cert) {
        const drop = eo(P(w5, 0.2, 0.8));
        cert.style.transform = `rotate(${lerp(-8, -2, drop)}deg) translateY(${(1 - drop) * 60}px)`;
        cert.style.opacity = String(drop);
    }
    const sig = root.querySelector('#sigP') as SVGPathElement | null;
    if (sig) {
        sig.style.strokeDasharray = '320';
        sig.style.strokeDashoffset = String(320 * (1 - P(w5, 0.7, 1.3)));
    }
    const stamp = el(root, '#stamp');
    if (stamp) {
        const stk = P(w5, 1.35, 1.55);
        stamp.style.opacity = stk > 0 ? '1' : '0';
        stamp.style.transform = `translate(-50%,-50%) rotate(-12deg) scale(${lerp(3, 1, eio(stk))})`;
    }
    const shake = t > 21.55 && t < 21.85 ? (hash(fr) * 2 - 1) * 8 * (1 - P(t, 21.55, 21.85)) : 0;
    const body = el(root, '#s5body');
    if (body) body.style.transform = (m ? '' : 'translateX(-50%) ') + `translate(${shake}px,${shake * 0.6}px)`;
    [...root.querySelectorAll('#stats .st')].forEach((stat, index) => {
        const k = P(w5, 1.8 + index * 0.13, 2.2 + index * 0.13);
        const node = stat as HTMLElement;
        node.style.opacity = String(k);
        node.style.transform = `translateY(${(1 - eo(k)) * 16}px)`;
    });
    const cash = el(root, '#cash');
    if (cash) cash.textContent = `$${fmt(money * eo(P(w5, 1.9, 3.2)))}`;

    const o6 = P(t, 25.6, 26.1);
    setOp(el(root, '#s6'), o6);
    const w6 = t - 25.6;
    [...root.querySelectorAll('#s6 .wrap > *')].forEach((kid, index) => {
        const kk = eo(P(w6, 0.1 + index * 0.15, 0.6 + index * 0.15));
        const node = kid as HTMLElement;
        node.style.opacity = String(kk);
        node.style.transform = `translateY(${(1 - kk) * 18}px)`;
    });
    const pulse = w6 > 1.4 ? (Math.sin((w6 - 1.4) * 3.2) + 1) / 2 : 0;
    const cta = el(root, '#cta');
    if (cta) {
        cta.style.boxShadow = `0 0 0 1px #8B7BFF,0 18px ${50 + pulse * 40}px #4F3BFF${pulse > 0.5 ? 'cc' : '88'}`;
        cta.style.scale = String(1 + pulse * 0.025);
    }
    const bg = el(root, '#s6 .bgb');
    if (bg) bg.style.transform = `translate(-50%,-50%) rotate(${w6 * 2}deg) scale(${1 + w6 * 0.01})`;
    const replay = el(root, '#replay');
    if (replay && handoffAt === Infinity) replay.style.opacity = t >= 25.6 ? '1' : '0.45';

    const hw = t - handoffAt;
    const wipe = el(root, '#wipe');
    const nameIt = el(root, '#nameit');
    const hud = el(root, '#hud');
    if (hw >= 0 && wipe && nameIt) {
        wipe.style.display = 'block';
        const a = eio(P(hw, 0, 0.45));
        const b = eio(P(hw, 0.55, 1.0));
        wipe.style.clipPath = `polygon(${b * 140 - 20}% 0, ${a * 140 - 20}% 0, ${a * 140 - 40}% 100%, ${b * 140 - 40}% 100%)`;
        nameIt.style.display = hw > 0.45 ? 'block' : 'none';
        if (hud) hud.style.opacity = hw > 0.45 ? '0' : '1';
        if (cap) cap.style.opacity = hw > 0.45 ? '0' : '1';
        if (replay) replay.style.opacity = hw > 0.45 ? '0' : '1';
    } else if (wipe && nameIt) {
        wipe.style.display = 'none';
        nameIt.style.display = 'none';
        if (hud) hud.style.opacity = '1';
        if (cap) cap.style.opacity = '1';
    }
    return hw >= 1;
};
