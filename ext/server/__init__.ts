import {AntiCheatTable} from "../shared/anti-cheat-table";
import {Fun} from "../shared/fun";
import {AntiCheatMonitor} from "./anti-cheat-monitor";

const antiCheatTable = new AntiCheatTable();
antiCheatTable.Initialize();

const antiCheatMonitor = new AntiCheatMonitor();
antiCheatMonitor.Initialize();

VUShared.Events.Subscribe(VUServer.EventsEnum.Level_Loaded, () => {
    Fun.adjustJumpHeight();
    Fun.noFallDamage();
    Fun.removeJumpPenalty();
});


