import {AntiCheatReport} from "./anti-cheat-report";
import {CheatType1, CheatType2} from "../shared/cheat-type";
import {PlayerStateManager} from "./player-state-manager";
import {DebugRender} from "./debug-render";

type DetectionFunction = (gunSway: VUShared.GunSway, weapon: VUClient.SoldierWeapon, weaponFiring: VUShared.WeaponFiring, deltaTime: number) => boolean;

const RecoilSumCount = 12;
const RecoilSumSampleCount = 5;
const RecoilThreshold = 0.0005;

export class AntiCheatMonitor {

    private totalUpdateTime: number = 0;
    private updateTime: number = 0;
    private readonly detections: { [K in CheatType1]: DetectionFunction };

    constructor(private readonly antiCheatReport: AntiCheatReport, private playerStateManager: PlayerStateManager, private readonly debugRender: DebugRender, private readonly updateTimeFrequency: number = 3) {
        const soldierCameraComponentDataInstance = TSUtils.RetrieveEBXInstance<FB.SoldierCameraComponentData>('Characters/Soldiers/MpSoldier');
        const soldierCameraComponentData = new FB.SoldierCameraComponentData(soldierCameraComponentDataInstance!);

        VUShared.Hooks.Install(VUClient.HooksEnum.EntityFactory_Create, 100, (entityData: VUShared.DataContainer, transform: VUShared.LinearTransform) => {
            if (entityData.instanceGuid === new VUShared.Guid('B815502A-1224-4F18-A244-FCE1F6141C3F')) {
                const referenceObjectData = new FB.ReferenceObjectData(entityData);
                referenceObjectData.excluded = true;
            }
        });
        VUShared.Events.Subscribe(VUClient.EventsEnum.Level_Loaded, () => {
        const worldPartDataInstance = TSUtils.RetrieveEBXInstance<FB.WorldPartData>('Levels/XP1_001/Objects');
        if (!worldPartDataInstance) {
            print("Something's fishy");
        } else {
            const worldPartData = new FB.WorldPartData(worldPartDataInstance!);
            worldPartData.MakeWritable();
            const indexOfWorldPartObject = worldPartData.objects.findIndex(object => object.instanceGuid === new VUShared.Guid('B815502A-1224-4F18-A244-FCE1F6141C3F'));
            worldPartData.objects.splice(indexOfWorldPartObject, 1);
        }
        });


        this.detections = {
            [CheatType1.GunSwayDeviation]: (gunSway: VUShared.GunSway, weapon: VUClient.SoldierWeapon, weaponFiring: VUShared.WeaponFiring, deltaTime: number) => {
                return gunSway.currentGameplayDeviationScaleFactor < 1.0 || gunSway.currentVisualDeviationScaleFactor < 1.0;
            },
            [CheatType1.GunSwayDataDeviationZoom]: (gunSway: VUShared.GunSway, weapon: VUClient.SoldierWeapon, weaponFiring: VUShared.WeaponFiring, deltaTime: number) => {
                if (!gunSway || !gunSway.data) return false;
                const gunSwayData = new FB.GunSwayData(gunSway.data);
                return gunSwayData.gameplayDeviationScaleFactorNoZoom < 1.0 ||
                    gunSwayData.gameplayDeviationScaleFactorZoom < 1.0 ||
                    gunSwayData.deviationScaleFactorNoZoom < 1.0 ||
                    gunSwayData.deviationScaleFactorZoom < 1.0;
            },
            [CheatType1.Aimbot]: (gunSway: VUShared.GunSway, weapon: VUClient.SoldierWeapon, weaponFiring: VUShared.WeaponFiring, deltaTime: number) => {
                const localPlayer = VUClient.PlayerManager.GetLocalPlayer();
                if (!localPlayer || !localPlayer.input || !localPlayer.soldier) return false;

                const {
                    input: {
                        authoritativeAimingYaw,
                        authoritativeAimingPitch
                    },
                    soldier
                } = localPlayer;

                if (this.playerStateManager.state.authoritativeAimingYaw !== authoritativeAimingYaw ||
                    this.playerStateManager.state.authoritativeAimingPitch !== authoritativeAimingPitch) {

                    this.playerStateManager.state.authoritativeAimingYaw = authoritativeAimingYaw;
                    this.playerStateManager.state.authoritativeAimingPitch = authoritativeAimingPitch;
                }

                const castDistance = 120;

                const s_Transform = VUClient.ClientUtils.GetCameraTransform()!;
                const s_CameraForward = new VUShared.Vec3(s_Transform.forward.x * -1, s_Transform.forward.y * -1, s_Transform.forward.z * -1);
                const s_CastPosition = new VUShared.Vec3(s_Transform.trans.x + (s_CameraForward.x * castDistance),
                    s_Transform.trans.y + (s_CameraForward.y * castDistance),
                    s_Transform.trans.z + (s_CameraForward.z * castDistance));

                const s_Raycast = VUClient.RaycastManager.Raycast(s_Transform.trans, s_CastPosition, 0);

                this.debugRender.text = `yaw = ${authoritativeAimingYaw}, pitch = ${authoritativeAimingPitch}, rayCast = ${s_Raycast && s_Raycast.rigidBody ? s_Raycast.rigidBody.typeInfo.name : '<unknown>'}`;
                return false;
            }
        };
    }


    public Initialize(): void {
        VUShared.Events.Subscribe(VUClient.EventsEnum.FPSCamera_Update, this.getFPSCameraUpdateCallback());
        VUShared.Events.Subscribe(VUShared.EventsEnum.GunSway_Update, this.getGunSwayUpdateCallback());
        VUShared.Events.Subscribe(VUClient.EventsEnum.Level_Loaded, this.getLevelLoadedCallback());
        VUShared.Events.Subscribe(VUShared.EventsEnum.WeaponFiring_Update, this.getWeaponFiringUpdateCallback());
    }

    private clientUpdateInputOnce() {

    }

    private getFPSCameraUpdateCallback() {
        return (deltaTime: number) => {
            this.updateTime += deltaTime;
            this.totalUpdateTime += deltaTime;
            if (this.updateTime % this.updateTimeFrequency) {
                this.updateTime = 0;
                this.clientUpdateInputOnce();
            }
            this.debugRender.render();
        };
    }

    private getGunSwayUpdateCallback() {
        return (gunSway: VUShared.GunSway, weapon: VUShared.Entity | undefined, weaponFiring: VUShared.WeaponFiring | undefined, deltaTime: number) => {
            if (!weapon || !weaponFiring) return;
            const soldierWeapon = new VUClient.SoldierWeapon(weapon);
            for (const detectionType in this.detections) {
                const detectionFunction = this.detections[<CheatType1>detectionType];
                let detectionStatus = false;
                let detectionException = false;
                try {
                    detectionStatus = detectionFunction(gunSway, soldierWeapon, weaponFiring, deltaTime);
                } catch {
                    detectionException = true;
                }

                if (detectionStatus || detectionException) {
                    this.antiCheatReport.reportCheat({
                        type: <CheatType1>detectionType,
                        exception: detectionException
                    }, this.totalUpdateTime);
                }
            }
        };
    }

    private getLevelLoadedCallback(): Function {
        return (levelName: string, gameMode: string) => {
            this.totalUpdateTime = 0;
        };
    }

    private getWeaponFiringUpdateCallback(): Function {
        const rememberData: {
            recoilHistorySamples: Array<{ pitch: number, yaw: number }>
        } = {
            recoilHistorySamples: []
        };
        return (weaponFiring: VUShared.WeaponFiring) => {
            if (!weaponFiring.gunSway) return;
            if (weaponFiring.recoilTimer == 0) return;

            if ([6, 9].indexOf(weaponFiring.weaponState) === -1) return;
            const gunSway = weaponFiring.gunSway;
            if (gunSway.timeSinceLastShot > 0.5) {
                rememberData.recoilHistorySamples = [];
                return;
            }

            let pitch = gunSway.currentRecoilDeviation.pitch;
            if (pitch < 0) pitch = -pitch;

            let yaw = gunSway.currentRecoilDeviation.yaw;
            if (yaw < 0) yaw = -yaw;

            rememberData.recoilHistorySamples.push({
                pitch,
                yaw
            });

            if (rememberData.recoilHistorySamples.length > RecoilSumCount) {
                rememberData.recoilHistorySamples.shift();
            }

            if (rememberData.recoilHistorySamples.length == 1 && pitch < RecoilThreshold && yaw < RecoilThreshold) {
                this.antiCheatReport.reportCheat({
                    type: CheatType2.WeaponFiringNoRecoilOnce,
                    exception: false
                }, this.totalUpdateTime);
            }
            if (rememberData.recoilHistorySamples.length === RecoilSumCount) {
                const sortedByRecoilTimer = rememberData.recoilHistorySamples.sort((a, b) => b.pitch - a.pitch).slice(0, RecoilSumSampleCount);
                const sumPitch = sortedByRecoilTimer.reduce((a, b) => a + b.pitch, 0);
                const sumYaw = sortedByRecoilTimer.reduce((a, b) => a + b.yaw, 0);
                if (sumPitch < RecoilThreshold && sumYaw < RecoilThreshold) {
                    this.antiCheatReport.reportCheat({
                        type: CheatType2.WeaponFiringNoRecoil,
                        exception: false
                    }, this.totalUpdateTime);
                }
            }
        };
    }
}
