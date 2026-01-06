import { Settings } from "@/types/settings";

export const DEFAULT_SETTINGS: Settings = {
    durations: {
        work: 25,
        shortBreak: 5,
        longBreak: 15,
    },
    longBreakInterval: 4,
    autoStart: false,
    sound: {
        volume: 0.5,
        enabled: true,
    },
    notifications: {
        enabled: false,
    },
    media: {
        enabled: true,
    },
};
