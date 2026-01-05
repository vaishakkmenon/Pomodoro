export interface Settings {
    durations: {
        work: number;
        shortBreak: number;
        longBreak: number;
    };
    autoStart?: boolean;
    longBreakInterval: number;
    sound: {
        volume: number;
        enabled: boolean;
    };
    notifications: {
        enabled: boolean;
    };
}
