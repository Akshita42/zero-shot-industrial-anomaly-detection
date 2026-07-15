const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents, ImageRun
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Helpers ────────────────────────────────────────────────────────────────

const CONTENT_WIDTH = 9360; // US Letter, 1-inch margins

const border  = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function hRule(color = "2E75B6") {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
    children: [],
  });
}

function spacer(before = 0, after = 120) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial" })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial" })],
  });
}

function para(text, { bold = false, italic = false, center = false, size = 22 } = {}) {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 80, line: 360 },
    children: [new TextRun({ text, bold, italic, size, font: "Arial" })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });
}

function centerPara(text, { bold = false, size = 22, color = "000000" } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, bold, size, font: "Arial", color })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function diagramPlaceholder(figureNum, caption, imagePath) {
  let imageRun = null;
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      imageRun = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: fs.readFileSync(imagePath),
            transformation: {
              width: 500,
              height: 300,
            },
          }),
        ],
      });
    } catch (e) {
      console.warn(`Could not load image at ${imagePath}: ${e.message}`);
    }
  }

  return [
    spacer(120, 40),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      rows: [new TableRow({
        children: [new TableCell({
          borders,
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          margins: { top: 200, bottom: 200, left: 200, right: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: imageRun ? [
            imageRun,
            spacer(40, 40),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Figure ${figureNum}: ${caption}`, size: 20, italic: true, color: "555555", font: "Arial" })],
            })
          ] : [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `[ Insert Diagram Here ]`, size: 22, italic: true, color: "888888", font: "Arial" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40 },
              children: [new TextRun({ text: `Figure ${figureNum}: ${caption}`, size: 20, italic: true, color: "555555", font: "Arial" })],
            }),
          ],
        })],
      })],
    }),
    spacer(60, 120),
  ];
}

function screenshotPlaceholder(num, caption, imagePath) {
  let imageRun = null;
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      imageRun = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: fs.readFileSync(imagePath),
            transformation: {
              width: 500,
              height: 300,
            },
          }),
        ],
      });
    } catch (e) {
      console.warn(`Could not load screenshot at ${imagePath}: ${e.message}`);
    }
  }

  return [
    spacer(80, 40),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      rows: [new TableRow({
        children: [new TableCell({
          borders: { top: { style: BorderStyle.DASHED, size: 1, color: "AAAAAA" }, bottom: { style: BorderStyle.DASHED, size: 1, color: "AAAAAA" }, left: { style: BorderStyle.DASHED, size: 1, color: "AAAAAA" }, right: { style: BorderStyle.DASHED, size: 1, color: "AAAAAA" } },
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
          children: imageRun ? [
            imageRun,
            spacer(40, 40),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Screenshot ${num}: ${caption}`, size: 20, italic: true, color: "555555", font: "Arial" })],
            })
          ] : [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `[ Screenshot Placeholder ]`, size: 22, italic: true, color: "999999", font: "Arial" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40 },
              children: [new TextRun({ text: `Screenshot ${num}: ${caption}`, size: 20, italic: true, color: "555555", font: "Arial" })],
            }),
          ],
        })],
      })],
    }),
    spacer(40, 100),
  ];
}

function makeTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const hdrRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: "2E75B6", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF", font: "Arial" })],
      })],
    })),
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders,
      width: { size: colWidths[ci], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? "EBF3FB" : "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: cell, size: 20, font: "Arial" })],
      })],
    })),
  }));
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [hdrRow, ...dataRows],
  });
}

function codeBlock(lines) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({
      children: [new TableCell({
        borders,
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        shading: { fill: "1E1E1E", type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 160, right: 160 },
        children: lines.map(line => new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [new TextRun({ text: line, size: 18, font: "Courier New", color: "D4D4D4" })],
        })),
      })],
    })],
  });
}

// ─── CONTENT ─────────────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25CB", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.DECIMAL, text: "%2.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "404040" },
        paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    // ═══════════════════════════════════════════════════════════════
    // SECTION 1 — COVER PAGE
    // ═══════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(0, 200),
        centerPara("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", { bold: true, size: 22 }),
        spacer(20, 20),
        centerPara("[University / College Name]", { bold: false, size: 22, color: "555555" }),
        spacer(20, 20),
        centerPara("[City, State — PIN Code]", { bold: false, size: 20, color: "777777" }),
        spacer(60, 60),
        hRule("2E75B6"),
        spacer(60, 60),
        centerPara("FINAL PROJECT REPORT", { bold: true, size: 28, color: "1F3864" }),
        spacer(40, 40),
        centerPara("Submitted in partial fulfilment of the requirements for the degree of", { size: 22 }),
        spacer(20, 20),
        centerPara("Bachelor of Technology", { bold: true, size: 24 }),
        centerPara("in", { size: 22 }),
        centerPara("Computer Science and Engineering", { bold: true, size: 24 }),
        spacer(60, 60),
        hRule("2E75B6"),
        spacer(80, 80),
        centerPara("PROJECT TITLE", { bold: true, size: 22, color: "777777" }),
        spacer(20, 20),
        centerPara("Cloud Native AI Inspection Platform using MLOps and DevOps Pipeline", { bold: true, size: 28, color: "1F3864" }),
        spacer(10, 10),
        centerPara("Scalable Industrial Inspection System with CI/CD and Cloud Deployment", { bold: false, size: 24, color: "2E75B6" }),
        spacer(80, 80),
        hRule("CCCCCC"),
        spacer(60, 60),
        centerPara("Submitted by", { size: 22, color: "555555" }),
        spacer(20, 20),
        centerPara("[Student Name]", { bold: true, size: 24 }),
        centerPara("Roll No: [XXXXXX]", { size: 22 }),
        spacer(40, 40),
        centerPara("Under the Guidance of", { size: 22, color: "555555" }),
        spacer(20, 20),
        centerPara("[Supervisor Name]", { bold: true, size: 24 }),
        centerPara("[Designation], Department of CSE", { size: 22 }),
        spacer(60, 60),
        hRule("CCCCCC"),
        spacer(40, 40),
        centerPara("Academic Year: 2024 – 2025", { bold: true, size: 22 }),
        pageBreak(),

        // ─── CERTIFICATE ───
        spacer(0, 120),
        centerPara("CERTIFICATE", { bold: true, size: 32, color: "1F3864" }),
        hRule("2E75B6"),
        spacer(60, 60),
        para("This is to certify that the project entitled \"Cloud Native AI Inspection Platform using MLOps and DevOps Pipeline\" has been carried out by [Student Name] (Roll No: XXXXXX) of B.Tech 3rd year, Department of Computer Science and Engineering, [University Name], in partial fulfilment of the requirements for the degree of Bachelor of Technology in Computer Science and Engineering during the academic year 2024–2025."),
        spacer(20, 20),
        para("The work embodied in this report is original and has not been submitted earlier for any degree or diploma to this or any other university or institution."),
        spacer(120, 120),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [new TableRow({
            children: [
              new TableCell({
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Internal Examiner", bold: true, font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Name: ___________________", font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Signature: ___________________", font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Date: ___________________", font: "Arial", size: 22 })] }),
                ],
              }),
              new TableCell({
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "External Examiner", bold: true, font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Name: ___________________", font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Signature: ___________________", font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Date: ___________________", font: "Arial", size: 22 })] }),
                ],
              }),
            ],
          })],
        }),
        spacer(80, 80),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [new TableRow({
            children: [
              new TableCell({
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Project Guide", bold: true, font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "[Supervisor Name]", font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Signature: ___________________", font: "Arial", size: 22 })] }),
                ],
              }),
              new TableCell({
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                width: { size: 4680, type: WidthType.DXA },
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Head of Department", bold: true, font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "[HOD Name]", font: "Arial", size: 22 })] }),
                  new Paragraph({ children: [new TextRun({ text: "Signature: ___________________", font: "Arial", size: 22 })] }),
                ],
              }),
            ],
          })],
        }),
        pageBreak(),

        // ─── DECLARATION ───
        spacer(0, 80),
        centerPara("DECLARATION", { bold: true, size: 32, color: "1F3864" }),
        hRule("2E75B6"),
        spacer(60, 60),
        para("I hereby declare that the project work entitled \"Cloud Native AI Inspection Platform using MLOps and DevOps Pipeline\" is an original piece of work carried out by me under the guidance of [Supervisor Name], Department of Computer Science and Engineering, [University Name]."),
        spacer(20, 20),
        para("I further declare that this report or any part of it has not been submitted elsewhere for the award of any degree or diploma. All sources of information used in this project have been duly acknowledged in the bibliography."),
        spacer(120, 120),
        new Paragraph({
          children: [new TextRun({ text: "Date: ________________", font: "Arial", size: 22 })],
        }),
        spacer(20, 20),
        new Paragraph({
          children: [new TextRun({ text: "Place: ________________", font: "Arial", size: 22 })],
        }),
        spacer(80, 80),
        new Paragraph({
          children: [new TextRun({ text: "[Student Name]", bold: true, font: "Arial", size: 22 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: "Roll No: XXXXXX", font: "Arial", size: 22 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: "B.Tech CSE, [Year]", font: "Arial", size: 22 })],
        }),
        pageBreak(),

        // ─── ACKNOWLEDGEMENT ───
        spacer(0, 80),
        centerPara("ACKNOWLEDGEMENT", { bold: true, size: 32, color: "1F3864" }),
        hRule("2E75B6"),
        spacer(60, 60),
        para("I would like to express my sincere gratitude to everyone who supported and guided me throughout this project."),
        spacer(20, 20),
        para("First and foremost, I thank my project supervisor [Supervisor Name] for the continuous guidance and for always pointing me in the right direction whenever I was stuck, especially during the cloud deployment and CI/CD integration phases of the project."),
        spacer(20, 20),
        para("I am also grateful to the faculty of the Department of Computer Science and Engineering for their technical inputs and for providing access to the necessary lab resources."),
        spacer(20, 20),
        para("Special thanks to my friends and classmates who helped test the application and gave useful feedback on the frontend and monitoring setup. Their suggestions genuinely improved the final deployment."),
        spacer(20, 20),
        para("Finally, I thank my family for their patience and encouragement throughout this project, especially during the late nights spent debugging Docker networking issues."),
        spacer(80, 80),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "[Student Name]", bold: true, font: "Arial", size: 22 })],
        }),
        pageBreak(),

        // ─── ABSTRACT ───
        spacer(0, 80),
        centerPara("ABSTRACT", { bold: true, size: 32, color: "1F3864" }),
        hRule("2E75B6"),
        spacer(60, 60),
        para("This project presents a cloud-deployed AI inspection platform built with a focus on DevOps practices, automated CI/CD pipelines, and containerized deployment on AWS. The system uses a React and Vite-based frontend, a FastAPI backend with an integrated AI inference module, and is fully containerized using Docker and orchestrated with Docker Compose. An NGINX reverse proxy handles routing between services."),
        spacer(20, 20),
        para("The deployment infrastructure runs on AWS EC2, with Docker images stored in AWS ECR and inspection images and reports stored in S3. Application logs are forwarded to AWS CloudWatch for centralized monitoring. The CI/CD pipeline is implemented using GitHub Actions for automated builds and Jenkins for pipeline management. System metrics are collected via Prometheus and visualized using Grafana dashboards, giving real-time visibility into the application health."),
        spacer(20, 20),
        para("The project covers realistic deployment challenges including reverse proxy configuration, Docker networking issues, and OpenCV dependency resolution in Linux containers. Future improvements planned include migrating to Kubernetes for orchestration and using Terraform for infrastructure provisioning."),
        spacer(40, 40),
        new Paragraph({
          spacing: { before: 60, after: 80 },
          children: [
            new TextRun({ text: "Keywords: ", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "Docker, FastAPI, AWS, CI/CD, DevOps, Monitoring, Cloud Deployment, GitHub Actions, Jenkins, Prometheus, Grafana", size: 22, font: "Arial" }),
          ],
        }),
        pageBreak(),

        // ─── TABLE OF CONTENTS ───
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
          stylesWithLevels: [],
        }),
        pageBreak(),

        // ─── LIST OF FIGURES ───
        h1("List of Figures"),
        hRule(),
        spacer(20, 20),
        makeTable(
          ["Figure No.", "Caption", "Page"],
          [
            ["Figure 1", "High Level System Architecture", "XX"],
            ["Figure 2", "Docker Container Architecture", "XX"],
            ["Figure 3", "Docker Compose Networking", "XX"],
            ["Figure 4", "NGINX Reverse Proxy Flow", "XX"],
            ["Figure 5", "AWS Deployment Architecture", "XX"],
            ["Figure 6", "CI/CD Pipeline (GitHub Actions)", "XX"],
            ["Figure 7", "Jenkins Pipeline Workflow", "XX"],
            ["Figure 8", "Monitoring Stack Architecture", "XX"],
            ["Figure 9", "Future Kubernetes Architecture", "XX"],
            ["Figure 10", "Terraform Infrastructure Workflow", "XX"],
            ["Figure 11", "System Flowchart", "XX"],
            ["Figure 12", "Existing System DFD", "XX"],
          ],
          [1560, 6240, 1560]
        ),
        pageBreak(),

        // ─── LIST OF TABLES ───
        h1("List of Tables"),
        hRule(),
        spacer(20, 20),
        makeTable(
          ["Table No.", "Caption", "Page"],
          [
            ["Table 1", "Technology Stack Summary", "XX"],
            ["Table 2", "Functional Requirements", "XX"],
            ["Table 3", "Non-Functional Requirements", "XX"],
            ["Table 4", "AWS Services Used", "XX"],
            ["Table 5", "Test Cases — Functional Testing", "XX"],
            ["Table 6", "Test Cases — Structural Testing", "XX"],
            ["Table 7", "Monitoring Metrics Summary", "XX"],
          ],
          [1560, 6240, 1560]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 1 — INTRODUCTION
        // ═══════════════════════════════════════════════════════════════
        h1("1. Introduction"),
        hRule(),
        spacer(20, 20),
        para("Software deployment has changed a lot over the last few years. Traditionally, getting an application from a developer's laptop to a production server involved a bunch of manual steps, environment-specific configs, and a lot of \"it works on my machine\" moments. Container technologies and cloud platforms have changed that, making it possible to package applications consistently and deploy them in a reproducible way."),
        spacer(20, 20),
        para("This project builds on those ideas and extends them into a working, deployed AI inspection platform. The core idea is straightforward — there is an AI model that can analyse images for quality defects, and the challenge is building the complete system around it so that it runs reliably in a cloud environment with proper monitoring, logging, and an automated deployment pipeline."),
        spacer(20, 20),
        para("The main engineering work in this project is not the AI model itself. It is the infrastructure that makes the model usable as a deployed service — Docker containers, an NGINX reverse proxy, a FastAPI backend, GitHub Actions and Jenkins pipelines, AWS deployment, Prometheus metrics collection, and Grafana dashboards. These pieces together form a complete DevOps and MLOps workflow."),
        h2("1.1 Motivation"),
        para("The idea for this project came from noticing a common gap in student AI projects — most of them demonstrate a working model in a Jupyter notebook but never address how that model gets deployed, monitored, or updated in a real setting. Many companies need AI deployed as a service rather than as a script, and that requires proper containerization, CI/CD, and cloud infrastructure knowledge."),
        spacer(20, 20),
        para("This project tries to bridge that gap. The AI component handles image inspection, but the bulk of the engineering effort goes into building the DevOps infrastructure that would be needed in a production-like environment."),
        h2("1.2 Objectives"),
        bullet("Build a working AI inspection service accessible via a web interface."),
        bullet("Containerize all components using Docker and Docker Compose."),
        bullet("Set up an NGINX reverse proxy for request routing."),
        bullet("Deploy the complete system on AWS EC2 using ECR for image storage."),
        bullet("Implement CI/CD pipelines using GitHub Actions and Jenkins."),
        bullet("Set up Prometheus and Grafana for system monitoring."),
        bullet("Use S3 for storing uploaded images and generated reports."),
        bullet("Forward application logs to AWS CloudWatch."),
        bullet("Document realistic debugging issues encountered during development."),
        h2("1.3 Scope"),
        para("The project scope covers Phases 1 through 6 of the implementation — Docker setup, NGINX configuration, AWS deployment, CI/CD pipeline integration, monitoring setup, and logging configuration. Future phases such as Kubernetes migration and Terraform infrastructure-as-code are planned but not yet implemented."),
        spacer(20, 20),
        para("The platform is intended for industrial visual inspection use cases where images are uploaded and analysed for surface defects or quality issues. The current deployment runs on a single EC2 instance, which is sufficient for the scale of this project."),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 2 — PROBLEM STATEMENT
        // ═══════════════════════════════════════════════════════════════
        h1("2. Profile of the Problem / Problem Statement"),
        hRule(),
        spacer(20, 20),
        h2("2.1 Background"),
        para("Industrial quality inspection is traditionally done manually by trained operators who examine products on a production line. This is slow, expensive, and inconsistent. AI-based visual inspection offers a way to automate this — a trained model can flag defective items faster and more consistently than a human operator over a long shift."),
        spacer(20, 20),
        para("However, just having a working AI model is not enough. The model needs to be accessible to users via some kind of interface, it needs to be deployed somewhere reliable, and there needs to be a way to update it when the model improves. Most existing tools either provide the AI capability without proper deployment infrastructure, or they require expensive enterprise cloud contracts."),
        h2("2.2 Problem Statement"),
        para("The specific problem this project addresses is the lack of a complete, open-source, deployable pipeline for AI-based image inspection. The challenges can be summarised as:"),
        bullet("AI models are usually developed locally and are difficult to deploy at scale without containerization."),
        bullet("There is no automated mechanism to rebuild and redeploy when code or model changes are pushed."),
        bullet("Monitoring and logging are typically afterthoughts in student or small-team projects."),
        bullet("Cloud infrastructure setup is often done manually with no reproducibility."),
        bullet("Frontend and backend communication is error-prone when Docker networking is introduced."),
        h2("2.3 Rationale and Scope of the Study"),
        para("This project builds a complete cloud-native pipeline addressing all of the above challenges. The scope includes containerized deployment, automated CI/CD, cloud hosting on AWS, centralized logging, and real-time monitoring — all implemented and tested with a working AI inspection service at the core."),
        spacer(20, 20),
        para("The study focuses primarily on the infrastructure and deployment aspects, treating the AI model as a service component rather than the main research contribution."),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 3 — EXISTING SYSTEM
        // ═══════════════════════════════════════════════════════════════
        h1("3. Existing System"),
        hRule(),
        h2("3.1 Introduction"),
        para("Before building this project, it was useful to look at what already exists in the space of AI inspection tools and deployment frameworks. This helped identify specific gaps that the project could address."),
        h2("3.2 Existing Software and Approaches"),
        h3("3.2.1 Manual Inspection Systems"),
        para("Traditional industrial inspection relies on human visual inspection. Workers on a production line examine each item and manually reject defective units. This is reliable for simple tasks but becomes inconsistent for long shifts and high-volume production lines."),
        h3("3.2.2 Commercial AI Inspection Platforms"),
        para("Products like Cognex ViDi and Instrumental offer AI-powered quality inspection. These are enterprise-grade tools with full cloud infrastructure but come with high licensing costs. They are not open to customization and are impractical for student research or small-scale deployment."),
        h3("3.2.3 Research Prototypes"),
        para("Academic work in this area often produces models with good accuracy numbers but no deployment infrastructure. A typical research setup runs the model in a Jupyter notebook, uses a local directory as the image source, and has no concept of an API layer, container deployment, or monitoring."),
        h3("3.2.4 Open-Source MLOps Frameworks"),
        para("Tools like MLflow and BentoML help with model management but do not provide a complete deployment pipeline with CI/CD, cloud hosting, and monitoring out of the box. They solve part of the problem but require significant additional work to integrate into a full system."),
        h2("3.3 DFD for Existing / Present System"),
        spacer(20, 20),
        ...diagramPlaceholder(12, "Existing System DFD — Manual Inspection Workflow"),
        h2("3.4 What is New in the System to be Developed"),
        para("The system being developed addresses the gaps identified in existing approaches:"),
        bullet("Fully containerized deployment using Docker — reproducible across environments."),
        bullet("Complete CI/CD pipeline using GitHub Actions and Jenkins — automatic rebuild and deploy on push."),
        bullet("Cloud deployment on AWS EC2 with ECR and S3 integration."),
        bullet("Real-time monitoring via Prometheus and Grafana."),
        bullet("Centralized logging via AWS CloudWatch."),
        bullet("NGINX reverse proxy for clean request routing."),
        bullet("REST API interface via FastAPI — making the AI model accessible as a proper service."),
        bullet("React frontend for image upload and result display."),
        spacer(20, 20),
        para("This combination of features makes it a practical, deployable system rather than just a research prototype."),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 4 — PROBLEM ANALYSIS
        // ═══════════════════════════════════════════════════════════════
        h1("4. Problem Analysis"),
        hRule(),
        h2("4.1 Product Definition"),
        para("The product is a cloud-hosted AI image inspection platform. Users upload images via a web interface, the system runs them through an AI inference pipeline, and returns inspection results along with a downloadable report. The platform supports multiple concurrent users and logs all activity for audit and debugging purposes."),
        spacer(20, 20),
        para("The system is divided into three main layers: the frontend (React + Vite), the backend (FastAPI with AI inference), and the infrastructure layer (Docker, NGINX, AWS, CI/CD, monitoring)."),
        h2("4.2 Feasibility Analysis"),
        h3("4.2.1 Technical Feasibility"),
        para("All components used in this project are well-established, open-source tools with strong community support. Docker and Docker Compose are standard containerization tools. FastAPI is lightweight and performs well for REST API services. AWS free tier and student accounts provide adequate resources for deployment at this scale. The AI inference component uses standard Python libraries available on PyPI."),
        h3("4.2.2 Operational Feasibility"),
        para("The system is designed to be operated by a single administrator with basic knowledge of Docker and AWS. The Grafana dashboards provide operational visibility without requiring deep technical knowledge. The CI/CD pipeline means code updates are deployed automatically, reducing manual intervention."),
        h3("4.2.3 Economic Feasibility"),
        para("The infrastructure cost for this project on AWS is minimal — a t2.micro or t3.small EC2 instance is sufficient. Docker images stored in ECR and files in S3 are charged based on usage, and at the scale of this project, costs are well within AWS free tier limits. All software used is open-source."),
        h2("4.3 Project Plan"),
        spacer(20, 20),
        makeTable(
          ["Phase", "Description", "Duration", "Status"],
          [
            ["Phase 1", "Project setup, Frontend and Backend development", "3 weeks", "Completed"],
            ["Phase 2", "Docker containerization and Docker Compose setup", "2 weeks", "Completed"],
            ["Phase 3", "NGINX reverse proxy configuration", "1 week", "Completed"],
            ["Phase 4", "AWS EC2 and ECR deployment", "2 weeks", "Completed"],
            ["Phase 5", "GitHub Actions and Jenkins CI/CD pipeline", "2 weeks", "Completed"],
            ["Phase 6", "Prometheus, Grafana monitoring and CloudWatch logging", "2 weeks", "Completed"],
            ["Phase 7 (Future)", "Kubernetes migration and Terraform IaC", "Planned", "Future Scope"],
          ],
          [1560, 4200, 1680, 1920]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 5 — SOFTWARE REQUIREMENT ANALYSIS
        // ═══════════════════════════════════════════════════════════════
        h1("5. Software Requirement Analysis"),
        hRule(),
        spacer(20, 20),
        h2("5.1 Introduction"),
        para("This section documents the functional and non-functional requirements of the platform. Requirements were gathered by first defining what the system needed to do from a user perspective, then working backwards to understand the infrastructure needs."),
        h2("5.2 General Description"),
        h3("5.2.1 Product Perspective"),
        para("The platform is a standalone web application deployed on AWS. It is accessible via a public IP or domain name through a browser. The system does not depend on any third-party AI APIs — inference runs locally within the Docker container."),
        h3("5.2.2 User Classes"),
        bullet("End User — Uploads images, views results, and downloads reports."),
        bullet("Administrator — Manages deployment, monitors system health, and manages CI/CD configuration."),
        h3("5.2.3 Technology Stack"),
        spacer(20, 20),
        makeTable(
          ["Component", "Technology", "Purpose"],
          [
            ["Frontend", "React 18 + Vite", "User interface for image upload and result display"],
            ["Backend API", "FastAPI (Python)", "REST API server and AI inference integration"],
            ["Containerization", "Docker + Docker Compose", "Service packaging and orchestration"],
            ["Reverse Proxy", "NGINX", "Request routing, static file serving"],
            ["Cloud Platform", "AWS EC2", "Application hosting"],
            ["Container Registry", "AWS ECR", "Docker image storage"],
            ["Object Storage", "AWS S3", "Image and report storage"],
            ["Log Management", "AWS CloudWatch", "Centralized log aggregation"],
            ["CI/CD", "GitHub Actions + Jenkins", "Automated build and deployment"],
            ["Metrics", "Prometheus", "Metric collection and alerting"],
            ["Dashboards", "Grafana", "Metric visualization"],
            ["Logging", "Python structlog", "Structured application logging"],
          ],
          [2520, 2520, 4320]
        ),
        h2("5.3 Specific Requirements"),
        h3("5.3.1 Functional Requirements"),
        spacer(20, 20),
        makeTable(
          ["Req. ID", "Description", "Priority"],
          [
            ["FR-01", "User can upload an image via the web interface", "High"],
            ["FR-02", "System runs AI inference on uploaded image", "High"],
            ["FR-03", "System returns inspection result with confidence score", "High"],
            ["FR-04", "System generates and stores downloadable report in S3", "High"],
            ["FR-05", "CI/CD pipeline rebuilds and redeploys on code push", "High"],
            ["FR-06", "Prometheus collects metrics from the backend service", "Medium"],
            ["FR-07", "Grafana displays live metrics dashboard", "Medium"],
            ["FR-08", "CloudWatch receives application logs from containers", "Medium"],
            ["FR-09", "FastAPI exposes Swagger docs at /docs endpoint", "Low"],
            ["FR-10", "System handles concurrent image upload requests", "Medium"],
          ],
          [1680, 5760, 1920]
        ),
        spacer(20, 20),
        h3("5.3.2 Non-Functional Requirements"),
        spacer(20, 20),
        makeTable(
          ["Req. ID", "Description", "Metric"],
          [
            ["NFR-01", "API response time for inference", "< 5 seconds (CPU)"],
            ["NFR-02", "System should remain available during CI/CD deployment", "Rolling update strategy"],
            ["NFR-03", "Logs should be available in CloudWatch within 60 seconds", "< 60 seconds"],
            ["NFR-04", "Docker images should be rebuilt on every GitHub push", "Automated trigger"],
            ["NFR-05", "Grafana dashboard refresh rate", "30-second intervals"],
            ["NFR-06", "NGINX should handle at least 100 concurrent connections", "Load tested"],
          ],
          [1680, 5400, 2280]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 6 — DESIGN
        // ═══════════════════════════════════════════════════════════════
        h1("6. Design"),
        hRule(),
        h2("6.1 System Design"),
        para("The system is designed as a set of isolated services that communicate through well-defined interfaces. Each service runs in its own Docker container, and Docker Compose manages the container lifecycle and networking."),
        spacer(20, 20),
        para("The high-level flow is: user sends a request through the browser, NGINX receives it on port 80, proxies it to either the React frontend container or the FastAPI backend container depending on the URL path, the backend processes the request (including AI inference if needed), results are stored in S3, and a response is sent back."),
        spacer(20, 20),
        ...diagramPlaceholder(1, "High Level System Architecture"),
        h2("6.2 Design Notations"),
        h3("6.2.1 Docker Container Architecture"),
        para("The application is split into four containers: frontend (React), backend (FastAPI), proxy (NGINX), and monitoring (Prometheus + Grafana). These containers communicate over a Docker bridge network created by Docker Compose."),
        spacer(20, 20),
        ...diagramPlaceholder(2, "Docker Container Architecture"),
        h3("6.2.2 Docker Compose Networking"),
        para("Docker Compose creates an internal bridge network. The frontend container is not directly accessible from outside — all external traffic goes through NGINX. NGINX forwards /api/* requests to the FastAPI container and everything else to the frontend container. This avoids the common problem where a frontend running in a browser calls localhost and expects to reach the backend, which does not work inside Docker."),
        spacer(20, 20),
        ...diagramPlaceholder(3, "Docker Compose Networking Diagram"),
        h3("6.2.3 NGINX Reverse Proxy Flow"),
        ...diagramPlaceholder(4, "NGINX Reverse Proxy Request Flow"),
        h3("6.2.4 AWS Deployment Architecture"),
        para("The deployment runs on a single EC2 instance. The instance pulls the latest Docker images from ECR, runs Docker Compose, and the application becomes accessible via the instance public IP. S3 is used for object storage and CloudWatch for log forwarding."),
        spacer(20, 20),
        ...diagramPlaceholder(5, "AWS Deployment Architecture"),
        makeTable(
          ["AWS Service", "Usage"],
          [
            ["EC2 (t3.small)", "Hosts Docker containers — all application services run here"],
            ["ECR (Elastic Container Registry)", "Stores Docker images pushed by CI/CD pipeline"],
            ["S3", "Stores uploaded inspection images and generated PDF reports"],
            ["CloudWatch", "Receives structured logs from containers via log driver"],
            ["IAM Roles", "EC2 instance role with permissions for ECR, S3, and CloudWatch"],
          ],
          [3120, 6240]
        ),
        h2("6.3 Detailed Design"),
        h3("6.3.1 CI/CD Pipeline Design"),
        para("The CI/CD pipeline has two components — GitHub Actions handles the build and push to ECR, and Jenkins handles the deployment trigger on the EC2 instance. On every push to the main branch, GitHub Actions builds a new Docker image, tags it with the commit SHA, pushes it to ECR, and then triggers a Jenkins webhook. Jenkins SSHes into the EC2 instance and runs the deployment script, which pulls the new image and restarts the containers."),
        spacer(20, 20),
        ...diagramPlaceholder(6, "CI/CD Pipeline — GitHub Actions + Jenkins"),
        ...diagramPlaceholder(7, "Jenkins Pipeline Workflow"),
        h3("6.3.2 Monitoring Stack Design"),
        para("Prometheus scrapes metrics from the FastAPI backend every 15 seconds. The FastAPI service exposes a /metrics endpoint using the prometheus-fastapi-instrumentator library. Grafana connects to Prometheus as a data source and displays dashboards for request rate, response time, error rate, and container resource usage."),
        spacer(20, 20),
        ...diagramPlaceholder(8, "Monitoring Stack Architecture — Prometheus + Grafana"),
        h2("6.4 Flowcharts"),
        ...diagramPlaceholder(11, "System Flowchart — Inspection Request Flow"),
        h2("6.5 Pseudo Code — Inference Pipeline"),
        spacer(20, 20),
        codeBlock([
          "FUNCTION process_inspection_request(image_file):",
          "    1. Receive image via POST /api/v1/inspect",
          "    2. Validate file type (jpg, png only)",
          "    3. Upload original image to S3",
          "    4. Preprocess image (resize, normalize)",
          "    5. Run inference with loaded PyTorch/ONNX model",
          "    6. Extract bounding boxes, class labels, and confidence scores",
          "    7. Draw overlays (bounding boxes and labels) on the image",
          "    8. Save the processed image with defects highlighted to S3",
          "    9. Generate structured report (JSON/PDF) and store in S3",
          "   10. Log inspection transaction details in CloudWatch",
          "   11. Publish metrics (inference latency, defect type) to Prometheus",
          "   12. Return inspection metadata and S3 image URLs to client",
          "END FUNCTION"
        ]),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 7 — SOFTWARE IMPLEMENTATION AND CLOUD DEPLOYMENT
        // ═══════════════════════════════════════════════════════════════
        h1("7. Software Implementation and Cloud Deployment"),
        hRule(),
        spacer(20, 20),
        h2("7.1 Containerization with Docker"),
        para("Containerization forms the core deployment framework of the platform. Each service—the React frontend, the FastAPI backend, and NGINX reverse proxy—is packaged into separate containers to ensure independence and modularity."),
        spacer(10, 10),
        h3("7.1.1 Dockerfile Configuration (Backend FastAPI)"),
        para("The FastAPI backend Dockerfile uses a Python base image. It installs OpenCV system dependencies, copies source files, installs requirements, and runs the Uvicorn application server. Structured logging is configured to forward console logs directly to CloudWatch."),
        spacer(10, 10),
        codeBlock([
          "FROM python:3.10-slim",
          "WORKDIR /app",
          "RUN apt-get update && apt-get install -y \\",
          "    libgl1-mesa-glx \\",
          "    libglib2.0-0 \\",
          "    && rm -rf /var/lib/apt/lists/*",
          "COPY requirements.txt .",
          "RUN pip install --no-cache-dir -r requirements.txt",
          "COPY . .",
          "EXPOSE 8000",
          "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]"
        ]),
        spacer(20, 20),
        h3("7.1.2 Docker Compose Configuration"),
        para("Docker Compose manages all multi-container configurations. It defines the bridge network, environment variables, volumes for Prometheus data, log drivers, and sets service start order using dependencies. An internal network restricts direct access to databases and backends from external networks, routing all public traffic through NGINX."),
        spacer(10, 10),
        codeBlock([
          "version: '3.8'",
          "services:",
          "  frontend:",
          "    build: ./frontend",
          "    expose:",
          "      - \"5173\"",
          "    networks:",
          "      - app-network",
          "  backend:",
          "    build: ./backend",
          "    expose:",
          "      - \"8000\"",
          "    environment:",
          "      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}",
          "      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}",
          "      - S3_BUCKET_NAME=${S3_BUCKET_NAME}",
          "    networks:",
          "      - app-network",
          "  nginx:",
          "    image: nginx:alpine",
          "    ports:",
          "      - \"80:80\"",
          "    volumes:",
          "      - ./nginx.conf:/etc/nginx/nginx.conf:ro",
          "    depends_on:",
          "      - frontend",
          "      - backend",
          "    networks:",
          "      - app-network",
          "networks:",
          "  app-network:",
          "    driver: bridge"
        ]),
        pageBreak(),

        // ─── NGINX ───
        h2("7.2 Reverse Proxy with NGINX"),
        para("NGINX handles SSL termination, client request routing, and prevents Cross-Origin Resource Sharing (CORS) issues. All frontend assets are routed to the React app container on port 5173, while API endpoints starting with `/api/` are forwarded directly to the FastAPI server on port 8000."),
        spacer(10, 10),
        codeBlock([
          "events { worker_connections 1024; }",
          "http {",
          "    server {",
          "        listen 80;",
          "        location / {",
          "            proxy_pass http://frontend:5173;",
          "            proxy_set_header Host $host;",
          "            proxy_set_header X-Real-IP $remote_addr;",
          "        }",
          "        location /api/ {",
          "            proxy_pass http://backend:8000/api/;",
          "            proxy_set_header Host $host;",
          "            proxy_set_header X-Real-IP $remote_addr;",
          "        }",
          "    }",
          "}"
        ]),
        spacer(20, 20),
        h2("7.3 AWS Cloud Infrastructure"),
        para("The cloud infrastructure is provisioned on AWS using an EC2 instance. Application images are retrieved from AWS Elastic Container Registry (ECR) during deployment. Ingested raw images and generated quality reports are stored inside an AWS S3 bucket. System and access logs are forwarded directly to AWS CloudWatch for structured retention and analytics."),
        spacer(20, 20),
        h2("7.4 CI/CD Pipeline Implementation"),
        para("The deployment automation relies on GitHub Actions for Continuous Integration (CI) and Jenkins for Continuous Delivery (CD). The integration builds and pushes Docker containers, while the delivery pipeline handles zero-downtime updates."),
        spacer(10, 10),
        codeBlock([
          "name: DevOps Pipeline CI",
          "on:",
          "  push:",
          "    branches: [ main ]",
          "jobs:",
          "  build-and-push:",
          "    runs-on: ubuntu-latest",
          "    steps:",
          "    - uses: actions/checkout@v2",
          "    - name: Configure AWS credentials",
          "      uses: aws-actions/configure-aws-credentials@v1",
          "      with:",
          "        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}",
          "        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}",
          "        aws-region: us-east-1",
          "    - name: Login to ECR",
          "      id: login-ecr",
          "      uses: aws-actions/amazon-ecr-login@v1",
          "    - name: Build & Tag Images",
          "      run: |",
          "        docker build -t ${{ steps.login-ecr.outputs.registry }}/inspection-backend:latest ./backend",
          "        docker push ${{ steps.login-ecr.outputs.registry }}/inspection-backend:latest",
          "    - name: Trigger Jenkins Webhook",
          "      run: curl -X POST ${{ secrets.JENKINS_WEBHOOK_URL }}"
        ]),
        pageBreak(),

        // ─── MONITORING ───
        h2("7.5 Monitoring and Log Aggregation"),
        para("The observability framework collects infrastructure and application metrics. Prometheus scrapes performance telemetry at defined intervals. Grafana queries Prometheus data to display metrics like inference duration, memory consumption, request latency, and HTTP status code rates."),
        spacer(20, 20),
        makeTable(
          ["Metric Name", "Type", "Telemetry Description", "Target Alert Threshold"],
          [
            ["http_requests_total", "Counter", "Total HTTP requests processed by FastAPI", "N/A"],
            ["http_request_duration_seconds", "Histogram", "Latency distribution of inference and API requests", "> 3.0s (Warning)"],
            ["process_cpu_seconds_total", "Counter", "CPU usage of application container processes", "> 85% (Critical)"],
            ["process_virtual_memory_bytes", "Gauge", "Memory utilization of running processes", "> 1.5 GB (Warning)"],
            ["s3_upload_duration_seconds", "Histogram", "Time taken to upload reports and images to S3", "> 2.0s (Warning)"]
          ],
          [2200, 1160, 4200, 1800]
        ),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 8 — SOFTWARE TESTING AND RESULTS
        // ═══════════════════════════════════════════════════════════════
        h1("8. Software Testing and Results"),
        hRule(),
        spacer(20, 20),
        h2("8.1 Testing Methodology"),
        para("The platform underwent comprehensive validation focusing on performance, reliability, and functional accuracy. Automated tests verified API functionality. Verification screenshots were captured to audit execution state and ensure proper integration of the DevOps pipelines."),
        spacer(20, 20),
        h2("8.2 Test Cases"),
        h3("8.2.1 Functional Testing"),
        spacer(10, 10),
        makeTable(
          ["Test Case ID", "Description", "Inputs", "Expected Outcome", "Status"],
          [
            ["TC-FT-01", "Upload valid JPEG image", "sample_defect.jpg", "Returns inference result with 200 OK", "Pass"],
            ["TC-FT-02", "Upload invalid file type", "data.txt", "Returns 400 Bad Request", "Pass"],
            ["TC-FT-03", "Download generated report", "Report request ID", "Fetches generated PDF report from S3", "Pass"],
            ["TC-FT-04", "Concurrently process image uploads", "10 parallel requests", "Handles all requests within 6s SLA", "Pass"]
          ],
          [1360, 2520, 1680, 2520, 1280]
        ),
        spacer(20, 20),
        h3("8.2.2 Structural and Infrastructure Testing"),
        spacer(10, 10),
        makeTable(
          ["Test Case ID", "Description", "Evaluation Target", "Expected Infrastructure State", "Status"],
          [
            ["TC-IT-01", "Continuous integration build trigger", "GitHub push to main", "Image builds and pushes to ECR automatically", "Pass"],
            ["TC-IT-02", "Reverse proxy request routing", "Port 80 NGINX API route", "Forwards request to backend without CORS block", "Pass"],
            ["TC-IT-03", "Scrape interval timing check", "Prometheus target scrape", "Metrics collected from FastAPI every 15 seconds", "Pass"],
            ["TC-IT-04", "Centralized logging check", "FastAPI warning trace", "Log generated inside CloudWatch Streams", "Pass"]
          ],
          [1360, 2520, 1680, 2520, 1280]
        ),
        pageBreak(),

        // ─── SCREENSHOTS ───
        h2("8.3 Screen Captures and Verification"),
        para("The following section presents the live user interface, infrastructure verification, and metric dashboard screen captures gathered during staging execution."),
        spacer(10, 10),
        ...screenshotPlaceholder(1, "Web Application Portal — Image Upload Interface"),
        ...screenshotPlaceholder(2, "AI Model Inference Results showing Bounding Boxes and Defect Classification"),
        ...screenshotPlaceholder(3, "Grafana Dashboard showing Inference Latency and CPU Usage"),
        ...screenshotPlaceholder(4, "Jenkins Pipeline Console Output for Successful Deployment on AWS EC2"),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 9 — CONCLUSION AND FUTURE SCOPE
        // ═══════════════════════════════════════════════════════════════
        h1("9. Conclusion and Future Scope"),
        hRule(),
        spacer(20, 20),
        h2("9.1 Conclusion"),
        para("This project successfully demonstrated the deployment of a Cloud-Native AI Inspection Platform. By implementing automated CI/CD pipelines, containerizing all components using Docker, and establishing a robust monitoring stack with Prometheus and Grafana, we addressed the key operational challenges of deploying AI services in a production environment. The platform exhibits high reliability and provides thorough visibility into application performance metrics, meeting all core requirements."),
        spacer(20, 20),
        h2("9.2 Future Scope"),
        para("While the current platform is fully functional, future updates will focus on scalability and infrastructure automation:"),
        spacer(10, 10),
        h3("9.2.1 Migration to Kubernetes (Orchestration)"),
        para("The single EC2 deployment will be migrated to Amazon Elastic Kubernetes Service (EKS). A Kubernetes cluster will enable automated service scaling, self-healing, rolling updates, and dynamic resource allocation for memory-intensive inference tasks."),
        spacer(10, 10),
        ...diagramPlaceholder(9, "Future Kubernetes Cluster Architecture on AWS EKS"),
        spacer(10, 10),
        h3("9.2.2 Infrastructure-as-Code (IaC) with Terraform"),
        para("To make deployment repeatable across development, staging, and production environments, Terraform configurations will be introduced. Terraform will provision the entire AWS infrastructure—including VPCs, ECR repositories, S3 buckets, EKS clusters, and security policies—as code."),
        spacer(10, 10),
        ...diagramPlaceholder(10, "Terraform Infrastructure Provisioning Workflow"),
        pageBreak(),

        // ═══════════════════════════════════════════════════════════════
        // CHAPTER 10 — BIBLIOGRAPHY
        // ═══════════════════════════════════════════════════════════════
        h1("10. Bibliography"),
        hRule(),
        spacer(20, 20),
        numbered("Docker Documentation. Containerization Best Practices. https://docs.docker.com", 0),
        numbered("FastAPI Official Documentation. Building High Performance Web APIs. https://fastapi.tiangolo.com", 0),
        numbered("Amazon Web Services Documentation. Deploying Docker Containers on EC2 and Object Storage with S3. https://docs.aws.amazon.com", 0),
        numbered("GitHub Actions Continuous Integration User Manual. https://docs.github.com/en/actions", 0),
        numbered("Jenkins User Manual. Pipeline-as-Code with Jenkinsfile. https://www.jenkins.io/doc/", 0),
        numbered("Prometheus & Grafana Documentation. Setup and Dashboard Visualization. https://prometheus.io/docs and https://grafana.com/docs", 0),
        numbered("OpenCV Documentation. Image Processing and Bounding Overlays in Linux Environments. https://docs.opencv.org", 0)
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Final_Project_Report.docx", buffer);
    console.log("Report generated successfully!");
});
