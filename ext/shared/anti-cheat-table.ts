import Guid = VUShared.Guid;

export class AntiCheatEntry<T> {

    public readonly guid: Guid;
    private instance: VUShared.DataContainer | undefined;
    private concreteInstance: T | undefined;

    constructor(guid: Guid, private readonly tctor: (instance: VUShared.DataContainer) => T) {
        this.guid = guid;
    }

    public loadInstance(): boolean {
        this.instance = VUShared.ResourceManager.SearchForInstanceByGuid(this.guid);
        if (!this.instance) {
            return false;
        }
        this.concreteInstance = this.tctor(this.instance);
        return true;
    }

}

export class AntiCheatTable {

    // those are the anti cheat tables (ACT)
    private weaponFiringData: AntiCheatEntry<FB.WeaponFiringData>[] = [];
    private weaponShotModifiers: AntiCheatEntry<FB.WeaponShotModifier>[] = [];

    public Initialize(): void {
        print("Loading AntiCheat");
        VUShared.Events.Subscribe(VUShared.EventsEnum.Partition_Loaded, this.getOnPartitionLoadedCallback());
        VUShared.Events.Subscribe(VUServer.EventsEnum.Level_Loaded, this.getOnLevelLoadedCallback());
    }

    private getOnPartitionLoadedCallback(): Function {
        return (partition: VUShared.DatabasePartition) => {
            for (const instance of partition.instances) {
                if (instance.Is('WeaponFiringData') && instance.instanceGuid !== undefined) {
                    if (this.weaponFiringData.findIndex(entry => entry.guid === instance.instanceGuid) !== -1) {
                        continue;
                    }
                    this.weaponFiringData.push(
                        new AntiCheatEntry<FB.WeaponFiringData>(
                            instance.instanceGuid,
                            (instance: VUShared.DataContainer) => new FB.WeaponFiringData(instance)
                        )
                    );
                } else if (instance.Is('WeaponShotModifier') && instance.instanceGuid !== undefined) {
                    if (this.weaponShotModifiers.findIndex(entry => entry.guid === instance.instanceGuid) !== -1) {
                        continue;
                    }
                    this.weaponShotModifiers.push(
                        new AntiCheatEntry<FB.WeaponShotModifier>(
                            instance.instanceGuid,
                            (instance: VUShared.DataContainer) => new FB.WeaponShotModifier(instance)
                        )
                    );
                }
            }
        };
    }

    private getOnLevelLoadedCallback(): Function {
        return (levelName: string, gameMode: string, round: number, roundsPerMap: number) => {
            for (const weaponFiringDataEntry of this.weaponFiringData) {
                if (!weaponFiringDataEntry.loadInstance()) {
                    print(`Unable to loadInstance weaponFiringDataEntry of ${weaponFiringDataEntry.guid.ToString('B')}`);
                }
            }

            for (const weaponShotModifiersEntry of this.weaponShotModifiers) {
                if (!weaponShotModifiersEntry.loadInstance()) {
                    print(`Unable to loadInstance weaponShotModifiersEntry of ${weaponShotModifiersEntry.guid.ToString('B')}`);
                }
            }

            print("Reloaded all ACT");
        };
    }

}
