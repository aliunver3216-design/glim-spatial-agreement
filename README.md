# GLiM Spatial Agreement Analysis for Turkey

This repository contains the Google Earth Engine (GEE) script used in the study:

Reliability of the Global Lithological Map (GLiM) at the National Scale: A Multi-Metric Spatial Agreement Assessment for Turkey

The script implements the analytical workflow used to compare the globally harmonized GLiM lithological dataset with the national geological dataset of Turkey (MTA).

---

## Analytical Workflow

The workflow includes the following steps:

1. Clipping lithological datasets to the national boundary of Turkey  
2. Class-based lithological area calculations  
3. Area-weighted spatial agreement analysis between GLiM and MTA  
4. Lithological composition similarity assessment  
5. Attribute-based (class-wise) area agreement analysis  
6. Visualization of class-level agreement metrics  

---

## Software Environment

The analytical workflow was implemented using:

• Google Earth Engine (GEE) for spatial analysis  
• ArcGIS for preliminary vector editing and cartographic preparation

ArcGIS was used only for preprocessing steps, while the core analytical calculations were implemented in GEE.

---

## Repository Contents

gee_glim_turkey_agreement.js

This script includes:

• dataset preparation  
• class-based area statistics  
• spatial agreement calculations  
• lithological composition similarity analysis  
• attribute-based agreement metrics  
• chart generation

---

## Input Data

The script references prepared Google Earth Engine assets derived from the harmonized GLiM and MTA lithological datasets used in the manuscript.

Example asset paths:

projects/evo880/assets/TR_GLIM_son  
projects/evo880/assets/TR_MTA_son  

Users should replace these paths with their own prepared datasets if direct access is not available.

---

## Purpose

This repository is provided to support transparency and reproducibility of the analytical workflow presented in the manuscript.
