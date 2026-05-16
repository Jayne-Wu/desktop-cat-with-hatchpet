import { DEFAULT_SCALE } from "../../shared/scale-options.mjs";

export class PetRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.scale = DEFAULT_SCALE;
  }

  setScale(scale) {
    this.scale = scale;
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(pet, frame) {
    const drawWidth = Math.floor(frame.sourceWidth * this.scale);
    const drawHeight = Math.floor(frame.sourceHeight * this.scale);
    const offsetX = Math.floor((this.canvas.width - drawWidth) / 2);
    const offsetY = Math.floor(this.canvas.height - drawHeight);

    this.clear();
    this.context.drawImage(
      pet.image,
      frame.sourceX,
      frame.sourceY,
      frame.sourceWidth,
      frame.sourceHeight,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );
  }
}
