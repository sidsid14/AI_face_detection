import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as faceapi from 'face-api.js';

@Component({
  selector: 'app-webcam',
  templateUrl: './webcam.component.html',
  styleUrls: ['./webcam.component.scss'],
})
export class WebcamComponent implements OnInit {
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;
  @ViewChild('video', { static: true })
  public video!: ElementRef;
  @ViewChild('canvas', { static: true })
  public canvasRef!: ElementRef;

  stream: any;
  detection: any;
  resizedDetections: any;
  canvas: any;
  canvasEl: any;
  displaySize: any;
  videoInput: any;

  constructor(private elRef: ElementRef) {}

  async ngOnInit() {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('../../../assets/models'),
      await faceapi.nets.ssdMobilenetv1.loadFromUri('../../../assets/models'),
      await faceapi.nets.faceLandmark68Net.loadFromUri(
        '../../../assets/models'
      ),
      await faceapi.nets.faceRecognitionNet.loadFromUri(
        '../../../assets/models'
      ),
      await faceapi.nets.faceExpressionNet.loadFromUri(
        '../../../assets/models'
      ),
    ]).then(() => this.startVideo());
  }

  startVideo() {
    this.videoInput = this.video.nativeElement;
    navigator.mediaDevices
      .getUserMedia({ video: {}, audio: false })
      .then((stream) => (this.videoInput.srcObject = stream))
      .catch((err) => console.log(err));

    this.detect_Faces();
  }

  async detect_Faces() {
    this.elRef.nativeElement
      .querySelector('video')
      .addEventListener('play', async () => {
        this.canvas = await faceapi.createCanvasFromMedia(this.videoInput);
        this.canvasEl = this.canvasRef.nativeElement;
        this.canvasEl.appendChild(this.canvas);
        this.canvas.setAttribute('id', 'canvass');
        this.canvas.setAttribute(
          'style',
          `position: fixed;
          top: 0;
          left: 0;`
        );
        this.displaySize = {
          width: this.videoInput.width,
          height: this.videoInput.height,
        };
        faceapi.matchDimensions(this.canvas, this.displaySize);

        const labeledFaceDescriptors = await this.getLabeledFaceDescriptions();
        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

        setInterval(async () => {
          this.detection = await faceapi
            .detectAllFaces(
              this.videoInput,
              new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceDescriptors()
            .withFaceExpressions();

          this.resizedDetections = faceapi.resizeResults(
            this.detection,
            this.displaySize
          );

          const results = this.resizedDetections.map((d: any) => {
            return faceMatcher.findBestMatch(d?.descriptor);
          });

          this.canvas
            .getContext('2d')
            .clearRect(0, 0, this.canvas.width, this.canvas.height);
          faceapi.draw.drawDetections(this.canvas, this.resizedDetections);
          faceapi.draw.drawFaceLandmarks(this.canvas, this.resizedDetections);
          faceapi.draw.drawFaceExpressions(this.canvas, this.resizedDetections);

          results.forEach((result: any, i: number) => {
            console.log(result);
            const box = this.resizedDetections[i].detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, {
              label: result,
            });
            drawBox.draw(this.canvas);
          });
        }, 100);
      });
  }

  getLabeledFaceDescriptions() {
    const labels = ['Messi', 'Ronaldo'];
    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        for (let i = 1; i <= 2; i++) {
          const img = await faceapi.fetchImage(
            `../../../assets/labels/${label}/${i}.png`
          );
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detections) descriptions.push(detections.descriptor);
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  }
}
