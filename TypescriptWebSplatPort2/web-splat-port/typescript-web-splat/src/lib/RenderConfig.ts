export class RenderConfig {
  constructor(
    public no_vsync: boolean,
    public skybox: string | null = null,
    public hdr: boolean = false
  ) {}
}
