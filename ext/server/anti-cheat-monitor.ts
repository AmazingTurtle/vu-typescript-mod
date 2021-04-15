export class AntiCheatMonitor {

    public Initialize() {
        VUServer.NetEvents.Subscribe('AC:WeaponFiringData', (context: VUServer.Player, weaponFiringData: FB.WeaponFiringData) => {
            print(`Received WeaponFiringData from remote: ${context}, primaryFire = ${weaponFiringData.primaryFire}`);
        });
        VUServer.NetEvents.Subscribe('AC:WeaponShotModifier', (context: VUServer.Player, weaponShotModifier: FB.WeaponShotModifier) => {
            print(`Received WeaponShotModifier from remote: ${weaponShotModifier}`)
        });

        VUShared.Hooks.Install(VUServer.HooksEnum.Soldier_Damage, 100, (soldier: VUClient.SoldierEntity, info: VUClient.DamageInfo, giverInfo: VUClient.DamageGiverInfo | undefined) => {
            print(`received damage`);
        });

    }

}
