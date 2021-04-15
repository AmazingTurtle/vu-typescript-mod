export class Fun {

    static adjustJumpHeight() {
        const jumpStateDataInstance = TSUtils.RetrieveEBXInstance<FB.JumpStateData>('Characters/Soldiers/DefaultSoldierPhysics');
        if (!jumpStateDataInstance) {
            print(`jumpStateDataInstance not found`);
        } else {
            print(`jumpStateDataInstance found`);
            const jumpStateData = new FB.JumpStateData(jumpStateDataInstance);
            jumpStateData.MakeWritable();
            jumpStateData.jumpHeight = 4;
        }
    }

    static removeJumpPenalty() {
        const characterPhysicsDataInstance = TSUtils.RetrieveEBXInstance<FB.CharacterPhysicsData>('Characters/Soldiers/DefaultSoldierPhysics');
        if (!characterPhysicsDataInstance) {
            print(`characterPhysicsDataInstance not found`);
        } else {
            print(`characterPhysicsDataInstance found`);
            const characterPhysicsData = new FB.CharacterPhysicsData(characterPhysicsDataInstance);
            characterPhysicsData.MakeWritable();
            characterPhysicsData.jumpPenaltyTime = 0;
            characterPhysicsData.jumpPenaltyFactor = 0;
        }
    }

    static noFallDamage() {

        const mpSoldierCollisionDataInstance = TSUtils.RetrieveEBXInstance<FB.CollisionData>('Characters/Soldiers/MpSoldier');
        if (!mpSoldierCollisionDataInstance) {
            print(`mpSoldierCollisionDataInstance not found`);
        } else {
            print(`mpSoldierCollisionDataInstance found`);
            const mpSoldierCollisionData = new FB.CollisionData(mpSoldierCollisionDataInstance);
            mpSoldierCollisionData.MakeWritable();
            for (let i = 0; i < 5; i++) {
                mpSoldierCollisionData.damageAtHorizVelocity[i].x = 10000000;
                mpSoldierCollisionData.damageAtVerticalVelocity[i].x = 10000000;
            }
        }
    }

    static crazyT90() {
        const bulletEntityInstance = TSUtils.RetrieveEBXInstance<FB.BulletEntityData>('Vehicles/common/WeaponData/spec/MBT_Cannon_Firing_T90');
        if (!bulletEntityInstance) {
            print(`BulletEntityData for T90A not found`);
            return;
        }
        const bulletEntityData = new FB.BulletEntityData(bulletEntityInstance);
        bulletEntityData.MakeWritable();
        bulletEntityData.gravity = 0;
        bulletEntityData.impactImpulse = 600;
        bulletEntityData.damageFalloffStartDistance = 200;
        bulletEntityData.damageFalloffStartDistance = 400;


        const firingFunctionDataInstance = TSUtils.RetrieveEBXInstance<FB.FiringFunctionData>('Vehicles/common/WeaponData/spec/MBT_Cannon_Firing_T90');
        if (!firingFunctionDataInstance) {
            print(`BulletEntityData for T90A not found`);
            return;
        }
        const firingFunctionData = new FB.FiringFunctionData(firingFunctionDataInstance);
        firingFunctionData.MakeWritable();
        firingFunctionData.shot.numberOfBulletsPerShell = 20;
        firingFunctionData.shot.numberOfBulletsPerShot = 1;
        firingFunctionData.ammo.magazineCapacity = -1;
        firingFunctionData.fireLogic.rateOfFire = 1200;
        firingFunctionData.fireLogic.fireLogicType = 2;
        firingFunctionData.weaponDispersion.standDispersion.minAngle = 30.0;
        firingFunctionData.weaponDispersion.standDispersion.maxAngle = 30.0;
    }

    static m27NoRecoil() {
        const gunInstance = TSUtils.RetrieveEBXInstance<FB.GunSwayData>('Weapons/M27IAR/M27IAR');
        if (!gunInstance) return;
        print("making m27 without recoil");
        const gunSwayData = new FB.GunSwayData(gunInstance);
        gunSwayData.MakeWritable();
        gunSwayData.stand.zoom.baseValue.minAngle = 0;
        gunSwayData.stand.zoom.baseValue.maxAngle = 0;
        gunSwayData.stand.zoom.baseValue.increasePerShot = 0;
        gunSwayData.stand.zoom.baseValue.decreasePerSecond = 0;
        gunSwayData.stand.noZoom.baseValue.minAngle = 0;
        gunSwayData.stand.noZoom.baseValue.maxAngle = 0;
        gunSwayData.stand.noZoom.baseValue.increasePerShot = 0;
        gunSwayData.stand.noZoom.baseValue.decreasePerSecond = 0;
        gunSwayData.stand.zoom.recoil.recoilAmplitudeMax = 0;
        gunSwayData.stand.zoom.recoil.recoilAmplitudeIncPerShot = 0;
        gunSwayData.stand.zoom.recoil.horizontalRecoilAmplitudeIncPerShotMin = 0;
        gunSwayData.stand.zoom.recoil.horizontalRecoilAmplitudeIncPerShotMax = 0;
        gunSwayData.stand.zoom.recoil.horizontalRecoilAmplitudeMax = 0;
        gunSwayData.stand.zoom.recoil.recoilAmplitudeDecreaseFactor = 0;
        gunSwayData.stand.noZoom.recoil.recoilAmplitudeMax = 0;
        gunSwayData.stand.noZoom.recoil.recoilAmplitudeIncPerShot = 0;
        gunSwayData.stand.noZoom.recoil.horizontalRecoilAmplitudeIncPerShotMin = 0;
        gunSwayData.stand.noZoom.recoil.horizontalRecoilAmplitudeIncPerShotMax = 0;
        gunSwayData.stand.noZoom.recoil.horizontalRecoilAmplitudeMax = 0;
        gunSwayData.stand.noZoom.recoil.recoilAmplitudeDecreaseFactor = 0;
    }

}
