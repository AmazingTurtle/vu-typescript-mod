export type PlayerState = {
    authoritativeAimingYaw: number;
    authoritativeAimingPitch: number;
    aimLockFrameStack: number;
};

export class PlayerStateManager {

    public state: PlayerState = {
        authoritativeAimingYaw: 0,
        authoritativeAimingPitch: 0,
        aimLockFrameStack: 0
    };

    constructor() {
        VUShared.Events.Subscribe(VUClient.EventsEnum.Player_Respawn, this.getPlayerRespawnCallback());
    }


    private getPlayerRespawnCallback() {
        return (player: VUClient.Player) => {
            if (player == VUClient.PlayerManager.GetLocalPlayer() && player !== undefined) {
                this.state = {
                    authoritativeAimingYaw: 0,
                    authoritativeAimingPitch: 0,
                    aimLockFrameStack: 0
                };
            }
        };
    }
}
