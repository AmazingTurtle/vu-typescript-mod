import {CheatType1, CheatType2} from "../shared/cheat-type";

export type CheatReport = {

    type: CheatType1 | CheatType2;
    exception: boolean;

};

export class AntiCheatReport {

    private cheatReportTime: {[K in CheatType1 | CheatType2]: number} | undefined;

    constructor(private readonly cheatReportTimeThreshold: number = 1) {
        this.resetCheatReportTime();
        VUShared.Events.Subscribe(VUClient.EventsEnum.Player_Respawn, this.getPlayerRespawnCallback());
    }

    private resetCheatReportTime(): void {
        this.cheatReportTime = {
            [CheatType1.GunSwayDeviation]: 0,
            [CheatType1.GunSwayDataDeviationZoom]: 0,
            [CheatType1.Aimbot]: 0,
            [CheatType2.WeaponFiringNoRecoilOnce]: 0,
            [CheatType2.WeaponFiringNoRecoil]: 0,
        };
    }

    private getPlayerRespawnCallback(): Function {
        return (player: VUClient.Player) => {
            if (player != VUClient.PlayerManager.GetLocalPlayer()) return;
        };
    }

    public reportCheat(cheatReport: CheatReport, time: number): void {
        if (!this.cheatReportTime) return;
        if (time - this.cheatReportTime[cheatReport.type] < this.cheatReportTimeThreshold) return;
        this.cheatReportTime[cheatReport.type] = time;
        print(`Reported cheat ${cheatReport.type}, exception = ${cheatReport.exception}`);

    }

}
