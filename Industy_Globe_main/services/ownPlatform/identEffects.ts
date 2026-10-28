export interface IdentEffect {
    /** Multiplies storefront retention. Hearth is the one above 1. */
    familyRetention: number;
    /** Multiplies new viewers. Voltage is the one above 1. */
    youthGrowth: number;
    /** Weight on the expensive plan. Linen is the one above 1. */
    premiumLift: number;
    summary: string;
}

const NEUTRAL: IdentEffect = {
    familyRetention: 1,
    youthGrowth: 1,
    premiumLift: 1,
    summary: 'The sting is the brand. Audience math stays put.',
};

/** Small, real effects on the three idents the service already names for families, youth, and luxury. */
export const identityEffects = (id: string): IdentEffect => {
    if (id === 'hearth') {
        return {
            familyRetention: 1.1,
            youthGrowth: 1,
            premiumLift: 1,
            summary: 'Families stay subscribed longer. +10% retention, and they leave more slowly once the service is full.',
        };
    }
    if (id === 'voltage') {
        return {
            familyRetention: 1,
            youthGrowth: 1.12,
            premiumLift: 1,
            summary: 'Young viewers show up faster. +12% new viewers.',
        };
    }
    if (id === 'linen') {
        return {
            familyRetention: 1,
            youthGrowth: 1,
            premiumLift: 1.85,
            summary: 'Premium plans take a larger share of new subscribers.',
        };
    }
    return NEUTRAL;
};
