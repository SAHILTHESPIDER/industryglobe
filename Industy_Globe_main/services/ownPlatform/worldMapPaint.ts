import { WORLD_PATHS } from './worldPaths';

interface Ring {
    pts: [number, number][];
    area: number;
}

export interface PaintedPath {
    id: string;
    /** Outline, plus even-odd holes where a smaller country sits entirely inside. */
    d: string;
    area: number;
    /** Hosts that contain another market need evenodd so the hole is not filled. */
    holed: boolean;
}

const ringsOf = (d: string): Ring[] => {
    const rings: Ring[] = [];
    for (const sub of d.split('Z')) {
        const pts: [number, number][] = [];
        const matcher = /(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g;
        let match: RegExpExecArray | null = matcher.exec(sub);
        while (match) {
            pts.push([Number(match[1]), Number(match[2])]);
            match = matcher.exec(sub);
        }
        if (pts.length < 3) continue;
        let signed = 0;
        for (let index = 0; index < pts.length; index += 1) {
            const [x1, y1] = pts[index];
            const [x2, y2] = pts[(index + 1) % pts.length];
            signed += x1 * y2 - x2 * y1;
        }
        rings.push({ pts, area: Math.abs(signed) / 2 });
    }
    return rings;
};

const pointInRing = (x: number, y: number, pts: [number, number][]): boolean => {
    let inside = false;
    for (let index = 0, previous = pts.length - 1; index < pts.length; previous = index, index += 1) {
        const [xi, yi] = pts[index];
        const [xj, yj] = pts[previous];
        const crosses = (yi > y) !== (yj > y);
        if (crosses && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi) inside = !inside;
    }
    return inside;
};

/** Even-odd across every ring, matching the fill rule used once a hole is cut. */
export const pointInPath = (x: number, y: number, d: string): boolean => {
    const hits = ringsOf(d).reduce((sum, ring) => sum + (pointInRing(x, y, ring.pts) ? 1 : 0), 0);
    return hits % 2 === 1;
};

const interiorSamples = (rings: Ring[]): [number, number][] => {
    if (!rings.length) return [];
    const ring = rings.reduce((best, item) => item.area > best.area ? item : best);
    const xs = ring.pts.map(point => point[0]);
    const ys = ring.pts.map(point => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const samples: [number, number][] = [];
    const steps = 7;
    for (let iy = 0; iy <= steps; iy += 1) {
        for (let ix = 0; ix <= steps; ix += 1) {
            const x = minX + ((maxX - minX) * ix) / steps + 0.2;
            const y = minY + ((maxY - minY) * iy) / steps + 0.2;
            const inside = rings.reduce((sum, item) => sum + (pointInRing(x, y, item.pts) ? 1 : 0), 0) % 2 === 1;
            if (inside) samples.push([x, y]);
        }
    }
    return samples;
};

/**
 * Large countries paint first. A market whose interior sits inside a bigger one
 * (Lesotho in South Africa, and the same test for every other pair) is cut out
 * of the host with an even-odd hole and then painted again on top. Clicks in the
 * hole miss the host even if paint order is wrong, and the smaller shape still
 * wins when it is drawn last. Dots for countries with no coastline are separate.
 */
export const paintedWorldPaths = (): PaintedPath[] => {
    const parsed = Object.entries(WORLD_PATHS).map(([id, d]) => {
        const rings = ringsOf(d);
        return { id, d, rings, area: rings.reduce((sum, ring) => sum + ring.area, 0), samples: [] as [number, number][] };
    });
    parsed.forEach(row => { row.samples = interiorSamples(row.rings); });

    const holes = new Map<string, string[]>();
    parsed.forEach(guest => {
        if (guest.samples.length < 4) return;
        let host: { id: string; area: number } | null = null;
        parsed.forEach(candidate => {
            if (candidate.id === guest.id || candidate.area < guest.area * 2) return;
            const inside = guest.samples.filter(([x, y]) => {
                const hits = candidate.rings.reduce((sum, ring) => sum + (pointInRing(x, y, ring.pts) ? 1 : 0), 0);
                return hits % 2 === 1;
            }).length;
            if (inside / guest.samples.length < 0.9) return;
            if (!host || candidate.area < host.area) host = { id: candidate.id, area: candidate.area };
        });
        if (!host) return;
        const list = holes.get(host.id) || [];
        list.push(guest.d);
        holes.set(host.id, list);
    });

    return parsed
        .map(row => {
            const extra = holes.get(row.id);
            return {
                id: row.id,
                d: extra && extra.length ? `${row.d}${extra.join('')}` : row.d,
                area: row.area,
                holed: Boolean(extra && extra.length),
            };
        })
        .sort((a, b) => b.area - a.area || a.id.localeCompare(b.id));
};
