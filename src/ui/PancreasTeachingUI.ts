import * as THREE from 'three';
import * as xb from 'xrblocks';
import { ANATOMICAL_STRUCTURES, QUIZ_QUESTIONS } from '../anatomyData';
import { SpeechHelper } from '../audio/SpeechHelper';
import { AnatomicalStructure, ModelLayerSettings, TabType } from '../types';

export class PancreasTeachingUI {
  card: xb.UICard;
  activeTab: TabType = 'anatomy';
  currentStructureIndex = 0;
  quizIndex = 0;
  quizScore = 0;
  quizFeedback = '';

  // UI state references
  private tabButtons: Map<TabType, xb.UIButton> = new Map();
  private tabContentContainers: Map<TabType, xb.UIPanel> = new Map();

  // Anatomy Guide references
  private structTitleText!: xb.UIText;
  private structLatinText!: xb.UIText;
  private structCategoryText!: xb.UIText;
  private structSummaryText!: xb.UIText;
  private structRelationsText!: xb.UIText;
  private structVascularText!: xb.UIText;
  private structFunctionText!: xb.UIText;
  private structClinicalText!: xb.UIText;
  private stepIndicatorText!: xb.UIText;

  // Quiz references
  private quizQuestionText!: xb.UIText;
  private quizScoreText!: xb.UIText;
  private quizHintText!: xb.UIText;
  private quizExplanationText!: xb.UIText;

  // Layer buttons
  private cutawayBtn!: xb.UIButton;
  private duodenumBtn!: xb.UIButton;
  private vesselsBtn!: xb.UIButton;
  private biliaryBtn!: xb.UIButton;
  private spleenBtn!: xb.UIButton;
  private pinsBtn!: xb.UIButton;
  private rotateBtn!: xb.UIButton;
  private opacitySliderText!: xb.UIText;

  // Callbacks
  onStructureSelected?: (struct: AnatomicalStructure) => void;
  onLayerSettingsChanged?: (settings: ModelLayerSettings) => void;

  settings: ModelLayerSettings = {
    pancreasOpacity: 0.94,
    showDuctCutaway: false,
    showDuodenum: true,
    showVessels: true,
    showBiliary: true,
    showSpleen: true,
    showAnnotations: true,
    showHistologyCallout: true,
    autoRotate: false,
  };

  constructor() {
    this.card = new xb.UICard({
      size: { width: 0.82, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 12,
        padding: 18,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderRadius: 20,
      },
    });
    this.card.name = 'PancreasTeachingMasterCard';
    this.card.position.set(0.62, 1.45, -0.9);
    this.card.rotation.y = -0.32;

    this.buildHeader();
    this.buildTabs();
    this.buildAnatomyGuideSection();
    this.buildDuctSection();
    this.buildPhysiologySection();
    this.buildClinicalSection();
    this.buildQuizSection();
    this.buildControlDeck();

    this.switchTab('anatomy');
    this.updateDisplayedStructure(ANATOMICAL_STRUCTURES[0]);
  }

  private buildHeader() {
    const titlePanel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
      },
      children: [
        new xb.UIPanel({
          style: { flexDirection: 'column', gap: 2 },
          children: [
            new xb.UIText({
              text: 'HUMAN PANCREAS ANATOMY',
              style: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
            }),
            new xb.UIText({
              text: '3D Medical Teaching & Clinical Pathology Model',
              style: { fontSize: 14, color: '#94a3b8' },
            }),
          ],
        }),
        new xb.UIButton({
          label: 'Pronounce',
          icon: 'volume_up',
          style: { paddingLeft: 12, paddingRight: 12, height: 36, fontSize: 13 },
          onClick: () => {
            const current = ANATOMICAL_STRUCTURES[this.currentStructureIndex];
            if (current) {
              SpeechHelper.speak(`${current.name}. In Latin: ${current.latinName}`);
            }
          },
        }),
      ],
    });

    this.card.add(titlePanel);
  }

  private buildTabs() {
    const tabs: { key: TabType; label: string; icon: string }[] = [
      { key: 'anatomy', label: 'Anatomy', icon: 'menu_book' },
      { key: 'ducts', label: 'Ducts', icon: 'alt_route' },
      { key: 'physiology', label: 'Physiology', icon: 'science' },
      { key: 'clinical', label: 'Clinical', icon: 'local_hospital' },
      { key: 'quiz', label: 'Quiz', icon: 'quiz' },
    ];

    const tabContainer = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        gap: 6,
        paddingTop: 4,
        paddingBottom: 6,
      },
    });

    tabs.forEach((tab) => {
      const btn = new xb.UIButton({
        label: tab.label,
        icon: tab.icon,
        style: {
          flexGrow: 1,
          height: 38,
          fontSize: 14,
          fontWeight: 'bold',
          borderRadius: 10,
        },
        onClick: () => this.switchTab(tab.key),
      });
      this.tabButtons.set(tab.key, btn);
      tabContainer.add(btn);
    });

    this.card.add(tabContainer);
  }

  private buildAnatomyGuideSection() {
    this.structTitleText = new xb.UIText({
      text: 'Structure Name',
      style: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8' },
    });

    this.structLatinText = new xb.UIText({
      text: 'Latin: Terminus',
      style: { fontSize: 15, color: '#f59e0b', marginBottom: 4 },
    });

    this.structCategoryText = new xb.UIText({
      text: 'Category: Pancreas',
      style: { fontSize: 13, color: '#94a3b8' },
    });

    this.structSummaryText = new xb.UIText({
      text: 'Summary information goes here.',
      style: { fontSize: 14, lineHeight: 1.4, color: '#e2e8f0', marginTop: 4 },
    });

    this.structRelationsText = new xb.UIText({
      text: '',
      style: { fontSize: 13, lineHeight: 1.35, color: '#cbd5e1', whiteSpace: 'pre-line' },
    });

    this.structVascularText = new xb.UIText({
      text: '',
      style: { fontSize: 13, lineHeight: 1.35, color: '#fca5a5' },
    });

    this.structFunctionText = new xb.UIText({
      text: '',
      style: { fontSize: 13, lineHeight: 1.35, color: '#86efac', whiteSpace: 'pre-line' },
    });

    this.structClinicalText = new xb.UIText({
      text: '',
      style: { fontSize: 13, lineHeight: 1.35, color: '#fde047', whiteSpace: 'pre-line' },
    });

    this.stepIndicatorText = new xb.UIText({
      text: '1 of 14',
      style: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8' },
    });

    const prevBtn = new xb.UIButton({
      label: 'Prev',
      icon: 'arrow_back',
      style: { width: 90, height: 36, fontSize: 13 },
      onClick: () => this.navigateStructure(-1),
    });

    const nextBtn = new xb.UIButton({
      label: 'Next',
      icon: 'arrow_forward',
      style: { width: 90, height: 36, fontSize: 13 },
      onClick: () => this.navigateStructure(1),
    });

    const navRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
      },
      children: [prevBtn, this.stepIndicatorText, nextBtn],
    });

    const contentPanel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 14,
      },
      children: [
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
          children: [this.structTitleText, this.structCategoryText],
        }),
        this.structLatinText,
        this.structSummaryText,
        new xb.UIText({ text: 'ANATOMICAL RELATIONS:', style: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' } }),
        this.structRelationsText,
        new xb.UIText({ text: 'BLOOD SUPPLY:', style: { fontSize: 13, fontWeight: 'bold', color: '#f87171' } }),
        this.structVascularText,
        new xb.UIText({ text: 'PHYSIOLOGICAL FUNCTIONS:', style: { fontSize: 13, fontWeight: 'bold', color: '#4ade80' } }),
        this.structFunctionText,
        new xb.UIText({ text: 'CLINICAL PEARL:', style: { fontSize: 13, fontWeight: 'bold', color: '#eab308' } }),
        this.structClinicalText,
        navRow,
      ],
    });

    this.tabContentContainers.set('anatomy', contentPanel);
    this.card.add(contentPanel);
  }

  private buildDuctSection() {
    const panel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 14,
      },
      children: [
        new xb.UIText({
          text: 'INTERNAL DUCTAL NETWORK & BILIARY TREE',
          style: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
        }),
        new xb.UIText({
          text: 'The pancreas is traversed longitudinally by the Duct of Wirsung, collecting enzymes in a herringbone branching pattern, merging with the Common Bile Duct at the Ampulla of Vater.',
          style: { fontSize: 14, lineHeight: 1.4, color: '#e2e8f0' },
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 6,
            padding: 10,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
          },
          children: [
            new xb.UIText({
              text: '• Main Pancreatic Duct (Wirsung): Normal caliber 2–3 mm. Joins common bile duct to form the Hepatopancreatic Ampulla.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#7dd3fc' },
            }),
            new xb.UIText({
              text: '• Accessory Pancreatic Duct (Santorini): Drains anterosuperior head into the Minor Duodenal Papilla.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#a5f3fc' },
            }),
            new xb.UIText({
              text: '• Common Bile Duct (CBD): Originates from hepatic/cystic union, embeds in posterior head groove.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#86efac' },
            }),
            new xb.UIText({
              text: '• Sphincter of Oddi: Muscular valve regulating flow of bile and pancreatic secretions, relaxes via CCK.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#fda4af' },
            }),
          ],
        }),
        new xb.UIButton({
          label: 'Inspect Duct of Wirsung in 3D',
          icon: 'visibility',
          style: { width: '100%', height: 38 },
          onClick: () => {
            const wirsung = ANATOMICAL_STRUCTURES.find((s) => s.id === 'main_duct');
            if (wirsung) this.selectStructureById('main_duct');
          },
        }),
      ],
    });

    panel.visible = false;
    this.tabContentContainers.set('ducts', panel);
    this.card.add(panel);
  }

  private buildPhysiologySection() {
    const panel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 14,
      },
      children: [
        new xb.UIText({
          text: 'EXOCRINE VS. ENDOCRINE PHYSIOLOGY',
          style: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
        }),
        new xb.UIText({
          text: 'The pancreas is a dual-function heterocrine gland: 98% exocrine (digestive enzymes + alkaline fluid) and 2% endocrine (hormones).',
          style: { fontSize: 14, lineHeight: 1.4, color: '#e2e8f0' },
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
          },
          children: [
            new xb.UIText({ text: '1. EXOCRINE FUNCTION (Acinar & Ductal Cells):', style: { fontSize: 14, fontWeight: 'bold', color: '#6ee7b7' } }),
            new xb.UIText({
              text: '• Proteases: Trypsinogen, Chymotrypsinogen, Procarboxypeptidase (activated by duodenal enteropeptidase)\n• Carbohydrates: Pancreatic Amylase (cleaves glycogen & starch)\n• Lipids: Pancreatic Lipase, Colipase, Phospholipase A2\n• Aqueous/Bicarbonate: Ductal cells secrete rich HCO3- (pH 8.2) to neutralize stomach acid.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#cbd5e1', whiteSpace: 'pre-line' },
            }),
          ],
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
          },
          children: [
            new xb.UIText({ text: '2. ENDOCRINE FUNCTION (Islets of Langerhans):', style: { fontSize: 14, fontWeight: 'bold', color: '#f59e0b' } }),
            new xb.UIText({
              text: '• Beta (β) Cells (~65%): Insulin (anabolic, promotes glucose uptake into muscle/adipose)\n• Alpha (α) Cells (~20%): Glucagon (catabolic, triggers hepatic glycogenolysis)\n• Delta (δ) Cells (~5%): Somatostatin (paracrine suppression of insulin and glucagon)\n• PP / F Cells (~3%): Pancreatic Polypeptide (regulates exocrine secretion)',
              style: { fontSize: 13, lineHeight: 1.35, color: '#cbd5e1', whiteSpace: 'pre-line' },
            }),
          ],
        }),
      ],
    });

    panel.visible = false;
    this.tabContentContainers.set('physiology', panel);
    this.card.add(panel);
  }

  private buildClinicalSection() {
    const panel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 14,
      },
      children: [
        new xb.UIText({
          text: 'CLINICAL PATHOLOGY & SURGERY',
          style: { fontSize: 18, fontWeight: 'bold', color: '#f87171' },
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
          },
          children: [
            new xb.UIText({ text: '• Acute Pancreatitis:', style: { fontSize: 14, fontWeight: 'bold', color: '#fca5a5' } }),
            new xb.UIText({
              text: 'Auto-digestion by prematurely activated trypsin. Common causes: Gallstones (40%), Alcohol (35%), Hypertriglyceridemia. Hallmark: Epigastric pain radiating to back, serum lipase >3x upper limit of normal.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#cbd5e1' },
            }),
          ],
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
          },
          children: [
            new xb.UIText({ text: '• Pancreatic Adenocarcinoma & Whipple Procedure:', style: { fontSize: 14, fontWeight: 'bold', color: '#fde047' } }),
            new xb.UIText({
              text: 'Head tumors cause Courvoisier painless jaundice. Pancreaticoduodenectomy (Whipple) resects pancreatic head, duodenum, gallbladder, distal bile duct, and occasionally partial gastrectomy with reconstruction.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#cbd5e1' },
            }),
          ],
        }),
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
          },
          children: [
            new xb.UIText({ text: '• Pancreas Divisum & Congenital Anomalies:', style: { fontSize: 14, fontWeight: 'bold', color: '#93c5fd' } }),
            new xb.UIText({
              text: 'Failure of embryonic ventral and dorsal duct systems to fuse. Bulk of secretion must discharge through the narrow accessory duct of Santorini, causing relative outflow stenosis.',
              style: { fontSize: 13, lineHeight: 1.35, color: '#cbd5e1' },
            }),
          ],
        }),
      ],
    });

    panel.visible = false;
    this.tabContentContainers.set('clinical', panel);
    this.card.add(panel);
  }

  private buildQuizSection() {
    this.quizQuestionText = new xb.UIText({
      text: 'Loading question...',
      style: { fontSize: 16, lineHeight: 1.4, fontWeight: 'bold', color: '#f8fafc' },
    });

    this.quizScoreText = new xb.UIText({
      text: 'Question 1 of 7  |  Score: 0',
      style: { fontSize: 14, color: '#38bdf8' },
    });

    this.quizHintText = new xb.UIText({
      text: '',
      style: { fontSize: 13, color: '#f59e0b' },
    });

    this.quizExplanationText = new xb.UIText({
      text: '',
      style: { fontSize: 14, lineHeight: 1.35, color: '#4ade80', whiteSpace: 'pre-line' },
    });

    const hintBtn = new xb.UIButton({
      label: 'Show Hint',
      icon: 'lightbulb',
      style: { width: 120, height: 36, fontSize: 13 },
      onClick: () => {
        const q = QUIZ_QUESTIONS[this.quizIndex];
        if (q) this.quizHintText.text = `Hint: ${q.hint}`;
      },
    });

    const nextQBtn = new xb.UIButton({
      label: 'Next Question',
      icon: 'skip_next',
      style: { width: 140, height: 36, fontSize: 13 },
      onClick: () => this.advanceQuiz(),
    });

    const quizActionRow = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
      children: [hintBtn, nextQBtn],
    });

    const panel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 10,
        padding: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 14,
      },
      children: [
        this.quizScoreText,
        this.quizQuestionText,
        this.quizHintText,
        this.quizExplanationText,
        new xb.UIText({
          text: '👉 Click directly on the corresponding 3D pin in the scene to submit your answer!',
          style: { fontSize: 13, color: '#94a3b8' },
        }),
        quizActionRow,
      ],
    });

    panel.visible = false;
    this.tabContentContainers.set('quiz', panel);
    this.card.add(panel);

    this.loadQuizQuestion(0);
  }

  private buildControlDeck() {
    this.opacitySliderText = new xb.UIText({
      text: 'Pancreas Opacity: 94%',
      style: { fontSize: 13, color: '#cbd5e1' },
    });

    const opacitySlider = new xb.UISlider({
      ariaLabel: 'Pancreas parenchyma opacity slider',
      min: 15,
      max: 100,
      step: 5,
      value: 94,
      style: { width: '100%', height: 34 },
      onInput: (val: number) => {
        this.settings.pancreasOpacity = val / 100;
        this.opacitySliderText.text = `Pancreas Opacity: ${val}%`;
        this.notifySettingsChanged();
      },
    });

    this.cutawayBtn = new xb.UIButton({
      label: 'Duct X-Ray: Off',
      icon: 'all_inclusive',
      style: { flexGrow: 1, height: 34, fontSize: 12 },
      onClick: () => {
        this.settings.showDuctCutaway = !this.settings.showDuctCutaway;
        this.cutawayBtn.label = this.settings.showDuctCutaway ? 'Duct X-Ray: On' : 'Duct X-Ray: Off';
        if (this.settings.showDuctCutaway) {
          this.settings.pancreasOpacity = 0.35;
          opacitySlider.value = 35;
          this.opacitySliderText.text = 'Pancreas Opacity: 35%';
        } else {
          this.settings.pancreasOpacity = 0.94;
          opacitySlider.value = 94;
          this.opacitySliderText.text = 'Pancreas Opacity: 94%';
        }
        this.notifySettingsChanged();
      },
    });

    this.duodenumBtn = new xb.UIButton({
      label: 'Duodenum: On',
      icon: 'circle',
      style: { flexGrow: 1, height: 34, fontSize: 12 },
      onClick: () => {
        this.settings.showDuodenum = !this.settings.showDuodenum;
        this.duodenumBtn.label = this.settings.showDuodenum ? 'Duodenum: On' : 'Duodenum: Off';
        this.notifySettingsChanged();
      },
    });

    this.vesselsBtn = new xb.UIButton({
      label: 'Vessels: On',
      icon: 'timeline',
      style: { flexGrow: 1, height: 34, fontSize: 12 },
      onClick: () => {
        this.settings.showVessels = !this.settings.showVessels;
        this.vesselsBtn.label = this.settings.showVessels ? 'Vessels: On' : 'Vessels: Off';
        this.notifySettingsChanged();
      },
    });

    this.spleenBtn = new xb.UIButton({
      label: 'Spleen: On',
      icon: 'lens',
      style: { flexGrow: 1, height: 34, fontSize: 12 },
      onClick: () => {
        this.settings.showSpleen = !this.settings.showSpleen;
        this.spleenBtn.label = this.settings.showSpleen ? 'Spleen: On' : 'Spleen: Off';
        this.notifySettingsChanged();
      },
    });

    this.pinsBtn = new xb.UIButton({
      label: '3D Pins: On',
      icon: 'pin_drop',
      style: { flexGrow: 1, height: 34, fontSize: 12 },
      onClick: () => {
        this.settings.showAnnotations = !this.settings.showAnnotations;
        this.pinsBtn.label = this.settings.showAnnotations ? '3D Pins: On' : '3D Pins: Off';
        this.notifySettingsChanged();
      },
    });

    this.rotateBtn = new xb.UIButton({
      label: 'Auto-Rotate: Off',
      icon: 'sync',
      style: { flexGrow: 1, height: 34, fontSize: 12 },
      onClick: () => {
        this.settings.autoRotate = !this.settings.autoRotate;
        this.rotateBtn.label = this.settings.autoRotate ? 'Auto-Rotate: On' : 'Auto-Rotate: Off';
        this.notifySettingsChanged();
      },
    });

    const deckPanel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderRadius: 14,
        marginTop: 4,
      },
      children: [
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
          children: [
            new xb.UIText({ text: 'MODEL & LAYER CONTROLS', style: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' } }),
            this.opacitySliderText,
          ],
        }),
        opacitySlider,
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 6 },
          children: [this.cutawayBtn, this.duodenumBtn, this.vesselsBtn],
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 6 },
          children: [this.spleenBtn, this.pinsBtn, this.rotateBtn],
        }),
      ],
    });

    this.card.add(deckPanel);
  }

  switchTab(tab: TabType) {
    this.activeTab = tab;
    this.tabButtons.forEach((btn, key) => {
      if (key === tab) {
        btn.style.backgroundColor = '#0284c7';
        btn.style.color = '#ffffff';
      } else {
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
        btn.style.color = '#cbd5e1';
      }
    });

    this.tabContentContainers.forEach((container, key) => {
      container.visible = key === tab;
    });

    // Auto-adjust model visualization based on tab
    if (tab === 'ducts') {
      this.settings.showDuctCutaway = true;
      this.settings.pancreasOpacity = 0.35;
      this.cutawayBtn.label = 'Duct X-Ray: On';
      this.opacitySliderText.text = 'Pancreas Opacity: 35%';
      this.notifySettingsChanged();
    }
  }

  navigateStructure(delta: number) {
    const total = ANATOMICAL_STRUCTURES.length;
    this.currentStructureIndex = (this.currentStructureIndex + delta + total) % total;
    const struct = ANATOMICAL_STRUCTURES[this.currentStructureIndex];
    this.updateDisplayedStructure(struct);
    if (this.onStructureSelected) {
      this.onStructureSelected(struct);
    }
  }

  selectStructureById(id: string) {
    const idx = ANATOMICAL_STRUCTURES.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.currentStructureIndex = idx;
      const struct = ANATOMICAL_STRUCTURES[idx];
      this.updateDisplayedStructure(struct);
      if (this.activeTab !== 'anatomy' && this.activeTab !== 'quiz') {
        this.switchTab('anatomy');
      }
    }
  }

  updateDisplayedStructure(struct: AnatomicalStructure) {
    this.structTitleText.text = struct.name;
    this.structLatinText.text = `Latin: ${struct.latinName}`;
    this.structCategoryText.text = `Category: ${struct.category.toUpperCase()}`;
    this.structSummaryText.text = struct.summary;
    this.structRelationsText.text = struct.anatomicalRelations.map((r) => `• ${r}`).join('\n');
    this.structVascularText.text = struct.bloodSupply;
    this.structFunctionText.text = struct.functions.map((f) => `• ${f}`).join('\n');
    this.structClinicalText.text = struct.clinicalSignificance;
    this.stepIndicatorText.text = `${this.currentStructureIndex + 1} of ${ANATOMICAL_STRUCTURES.length}`;
  }

  // Quiz submission & state
  handleQuizAnswerAttempt(structureId: string) {
    if (this.activeTab !== 'quiz') return;
    const currentQ = QUIZ_QUESTIONS[this.quizIndex];
    if (!currentQ) return;

    if (structureId === currentQ.targetStructureId) {
      this.quizScore++;
      this.quizExplanationText.text = `✅ CORRECT!\n${currentQ.explanation}`;
      this.quizExplanationText.style.color = '#4ade80';
      SpeechHelper.speak('Correct!');
    } else {
      const targetName = ANATOMICAL_STRUCTURES.find((s) => s.id === currentQ.targetStructureId)?.name || 'target';
      this.quizExplanationText.text = `❌ Not quite! That was ${ANATOMICAL_STRUCTURES.find((s) => s.id === structureId)?.name}.\nThe correct structure is ${targetName}.\n${currentQ.explanation}`;
      this.quizExplanationText.style.color = '#f87171';
      SpeechHelper.speak('Incorrect. Keep trying.');
    }

    this.quizScoreText.text = `Question ${this.quizIndex + 1} of ${QUIZ_QUESTIONS.length}  |  Score: ${this.quizScore}`;
  }

  private loadQuizQuestion(index: number) {
    this.quizIndex = index;
    const q = QUIZ_QUESTIONS[index];
    if (!q) return;

    this.quizQuestionText.text = q.question;
    this.quizScoreText.text = `Question ${this.quizIndex + 1} of ${QUIZ_QUESTIONS.length}  |  Score: ${this.quizScore}`;
    this.quizHintText.text = '';
    this.quizExplanationText.text = '';
  }

  private advanceQuiz() {
    this.quizIndex = (this.quizIndex + 1) % QUIZ_QUESTIONS.length;
    this.loadQuizQuestion(this.quizIndex);
  }

  private notifySettingsChanged() {
    if (this.onLayerSettingsChanged) {
      this.onLayerSettingsChanged(this.settings);
    }
  }
}
