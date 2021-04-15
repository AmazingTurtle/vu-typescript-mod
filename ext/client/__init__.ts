import {Fun} from "../shared/fun";
import {AntiCheatMonitor} from "./anti-cheat-monitor";
import {AntiCheatReport} from "./anti-cheat-report";
import {PlayerStateManager} from "./player-state-manager";
import {DebugRender} from "./debug-render";

const antiCheatMonitor = new AntiCheatMonitor(
    new AntiCheatReport(),
    new PlayerStateManager(),
    new DebugRender(),
    3
);
antiCheatMonitor.Initialize();

VUShared.Events.Subscribe(VUClient.EventsEnum.Player_Respawn, (player: VUClient.Player) => {
    if (player == VUClient.PlayerManager.GetLocalPlayer()) {
        Fun.adjustJumpHeight();
        Fun.noFallDamage();
        Fun.removeJumpPenalty();
        Fun.m27NoRecoil();
    }
});
