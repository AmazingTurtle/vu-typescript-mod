export class DebugRender {

    public text: string = '';

    constructor(private readonly doRender: boolean = true) {
    }


    render(): void {
        if (this.doRender) {
            VUClient.DebugRenderer.DrawText2D(20, 20, this.text, new VUShared.Vec4(0, 255, 64, 1), 1);
        }
    }

}
