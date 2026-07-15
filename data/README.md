# Dataset

This project uses the **MVTec Anomaly Detection (MVTec AD)** dataset for training and evaluation.

## About the Dataset

The MVTec AD dataset is one of the most widely used benchmark datasets for industrial visual anomaly detection. It contains high-resolution images of various objects and textures with both **normal (good)** and **defective** samples.

- **Dataset Name:** MVTec Anomaly Detection (MVTec AD)
- **Number of Categories:** 15
- **Image Resolution:** High-resolution RGB images
- **Task:** Industrial visual anomaly detection

Official Paper:
https://www.mvtec.com/fileadmin/Redaktion/mvtec.com/company/research/datasets/mvtec_ad.pdf

Official Dataset Page:
https://www.mvtec.com/company/research/datasets/mvtec-ad

Direct Download:
https://www.mvtec.com/company/research/datasets/mvtec-ad/downloads

---

## Download Instructions

1. Visit the official dataset page:
   https://www.mvtec.com/company/research/datasets/mvtec-ad

2. Download the dataset.

3. Extract the downloaded archive.

4. Place the extracted folder inside the project directory as shown below.

```
VisionInspect-AI/
│
├── dataset/
│   ├── bottle/
│   ├── cable/
│   ├── capsule/
│   ├── carpet/
│   ├── grid/
│   ├── hazelnut/
│   ├── leather/
│   ├── metal_nut/
│   ├── pill/
│   ├── screw/
│   ├── tile/
│   ├── toothbrush/
│   ├── transistor/
│   ├── wood/
│   └── zipper/
│
├── backend/
├── frontend/
└── ...
```

---

## Dataset Structure

Each category follows a similar directory structure.

```
bottle/
├── train/
│   └── good/
├── test/
│   ├── good/
│   ├── broken_large/
│   ├── broken_small/
│   └── contamination/
└── ground_truth/
```

- **train/good/** contains only normal images.
- **test/** contains both normal and defective images.
- **ground_truth/** contains segmentation masks for defective samples.

---

## Evaluation

The evaluation performed in this project follows the standard protocol of the MVTec AD benchmark.

Metrics reported include:

- Accuracy
- Precision
- Recall
- F1-Score
- Cosine Similarity-based Anomaly Score

---

## License

The MVTec AD dataset is **not included** in this repository.

Please download it only from the official MVTec website and use it according to its license and terms of use.

Official License & Terms:
https://www.mvtec.com/company/research/datasets/mvtec-ad

---

## Citation

If you use the MVTec AD dataset in your research, please cite the original paper:

```
@article{bergmann2019mvtec,
  title={MVTec AD — A Comprehensive Real-World Dataset for Unsupervised Anomaly Detection},
  author={Bergmann, Paul and Fauser, Michael and Sattlegger, David and Steger, Carsten},
  journal={IEEE Conference on Computer Vision and Pattern Recognition (CVPR)},
  year={2019}
}
```

---

## Acknowledgements

This project uses the MVTec AD dataset provided by MVTec Software GmbH for benchmarking industrial anomaly detection algorithms.

All rights to the dataset belong to the original authors and MVTec Software GmbH.