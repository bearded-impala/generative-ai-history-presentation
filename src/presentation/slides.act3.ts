import type { SlideData } from "./types";

export const ACT_III_SLIDES: SlideData[] = [
  {
    id: "slide-14",
    index: 13,
    act: 3,
    title: "The Spark of Attention",
    subtitle: "Dzmitry Bahdanau - Letting the Decoder Look Back, 2014",

    camera: {
      id: "slide-14-cam",
      position: [70, 3.0, -78],
      lookAt: [70, 2.5, -88],
      fov: 48,
      transitionDuration: 6,
      easing: "easeOutExpo",
      idleDrift: { enabled: true, amplitude: 0.08, speed: 0.15 },
    },

    environment: {
      background: "#0a0812",
      fog: { color: "#120c1e", near: 10, far: 45 },
      ambientIntensity: 0.22,
      keyLight: { color: "#b46aff", intensity: 0.7, position: [70, 6, -80] },
      particles: { count: 1400, color: "#ffd479", size: 0.02, speed: 0.18, spread: 20 },
    },

    visualState: {
      mode: "BAHDANAU_ATTENTION",
      props: {
        sourceLength: 8,
        targetStep: 5,
        alignmentWeights: "dynamic",
        peekBackEnabled: true,
        contextVectorBottleneckDissolved: true,
      },
    },

    visualGuide: {
      headline: "Keep every encoder state. Let the decoder choose a fresh blend at every step.",
      legend: [
        { color: "#ffd479", label: "Encoder hidden states: one per French word, none thrown away" },
        { color: "#dce6ff", label: "Decoder steps: the highlight is the English word being generated now" },
        { color: "#ffe08a", label: "Alignment weights (Σ = 1): they physically move as the output word changes" },
        { color: "#9aa3b2", label: "The old single context vector, deflating: nothing has to squeeze through it" },
      ],
      takeaway:
        "Bahdanau called it alignment. History calls it attention. Watch the weights shift as the output word changes. That's the whole idea.",
    },

    script: [
      "[LOOK TO AUDIENCE] Pick up exactly where we left off. One fixed context vector, straining under the weight of a whole paragraph. [PAUSE 2s] What if the decoder didn't have to rely on it?",
      "That same year - 2014 - the answer arrives. Dzmitry Bahdanau, working with Kyunghyun Cho and Yoshua Bengio, publishes the fix. [EMPHASIS] And in hindsight, it's almost embarrassingly simple.",
      "And the title gives away nothing. 'Neural Machine Translation by Jointly Learning to Align and Translate.' [PAUSE 1s] Modest words for one of the most consequential ideas in this story.",
      "So: don't throw away the encoder's hidden states once it finishes reading the sentence. [PAUSE 1s] [TRIGGER 3D MORPH] Keep every single one of them. One per input word. Then, every time the decoder produces a word, let it look back across all of those states at once, instead of just the last one.",
      "[TRIGGER 3D MORPH] And this is the key move. At every single step, the decoder mixes those states into a fresh weighted blend - and the weights themselves are learned. For this word, right now, which parts of the input actually matter? The network decides that itself, every time.",
      "[EMPHASIS] Bahdanau calls this alignment. History calls it something shorter. Attention. [TRIGGER 3D MORPH] And that bottleneck from a moment ago dissolves. Nothing has to be squeezed into one point any more, because the decoder can reach back and take what it needs.",
      "[PAUSE 1s] It's still bolted onto a recurrent network, though. Underneath all that new flexibility, it's still marching through the sentence one word at a time. [LOOK TO AUDIENCE] Which sets up a bolder question, a few years out. What if you didn't need the loop at all?",
    ],

    timelineYear: 2014,
    timelineLabel: "2014",
  },
  {
    id: "slide-15",
    index: 14,
    act: 3,
    title: "Attention Is All You Need",
    subtitle: "Vaswani et al. at Google Brain - The Transformer, 2017",
    camera: [
      {
        id: "slide-15-cam-1",
        position: [76, 9.0, -86],
        lookAt: [76, 4.5, -99],
        fov: 62,
        transitionDuration: 7,
        easing: "easeOutExpo",
      },
      {
        id: "slide-15-cam-2",
        position: [76, 5.2, -89],
        lookAt: [76, 4.2, -99],
        fov: 50,
        transitionDuration: 6,
        easing: "easeInOutCubic",
        idleDrift: { enabled: true, amplitude: 0.08, speed: 0.1 },
      },
    ],

    environment: {
      background: "#08060e",
      fog: { color: "#140a1e", near: 14, far: 60 },
      ambientIntensity: 0.45,
      keyLight: { color: "#ffd24a", intensity: 1.1, position: [76, 10, -88] },
      particles: { count: 2200, color: "#c77dff", size: 0.02, speed: 0.3, spread: 30 },
    },

    visualState: {
      mode: "TRANSFORMER_ARCHITECTURE_3D",
      props: {
        layerCount: 6,
        headsPerLayer: 8,
        recurrenceRemoved: true,
        parallelizationFactor: "O(1) sequential operations",
        architectureLabel: "Attention Is All You Need",
      },
    },

    visualGuide: {
      headline: "The recurrent chain dies. Two towers remain: a reader, and a writer.",
      legend: [
        { color: "#ff9d4d", label: "The loop dissolving: step ten no longer waits for step nine" },
        { color: "#c77dff", label: "ENCODER: directed self-attention - i→j is not j→i" },
        { color: "#ffd24a", label: "DECODER: French writer, looking back at English via cross-attention" },
        { color: "#dce6ff", label: "Bridges between towers: still a translator, not yet two separate models" },
      ],
      takeaway:
        "Two consequences, and one shape. No hundred-step chain for a gradient to decay across; a GPU can train the whole sequence at once; and the 2017 paper is two towers, not one.",
    },

    script: [
      "2017. Three years after Bahdanau's fix. Eight authors at Google - Ashish Vaswani first among them - look at attention bolted onto a recurrent network and ask a more radical question. [PAUSE 1s] What if attention isn't a patch on the loop? [EMPHASIS] What if attention is the whole architecture? And the title doesn't even pretend to be modest. 'Attention Is All You Need.'",
      "[TRIGGER 3D MORPH] So they delete the loop. Completely. No more one word at a time. No more waiting for step nine before you can start step ten. Every word in the sentence attends to every other word, all at once, as one enormous matrix multiplication.",
      "[EMPHASIS] [TRIGGER 3D MORPH] Now look at the shape they actually built. Not one stack. Two towers. Encoder and decoder. A reader on the left, a writer on the right. The 2017 paper is still a translator. [PAUSE 1s] In a couple of slides, GPT and BERT will each walk off with one of those towers. So look at both of them now, while they're still together.",
      "[EMPHASIS] There are two consequences here, and both are enormous. First, the vanishing gradient goes away - that was the correction signal fading to nothing as it walked back through a long chain of steps. Here there's no chain left for it to fade across. Second, parallelisation. [TRIGGER 3D MORPH] A GPU can train on a whole sequence at once, instead of grinding through it one word at a time.",
      "And that second one isn't just an engineering convenience. [PAUSE 1s] It's the architectural choice that makes training enormous models, on enormous piles of text, realistic for the first time in this field's history.",
      "[LOOK TO AUDIENCE] Every model whose name you already know owes its bones to this one eight-person paper. [PAUSE 2s] Let's go inside it.",
    ],

    timelineYear: 2017,
    timelineLabel: "2017",
  },
  {
    id: "slide-16",
    index: 15,
    act: 3,
    title: "Query, Key, Value",
    subtitle: "The Mechanics of Self-Attention",
    camera: {
      id: "slide-16-cam",
      position: [83, 5.0, -92],
      lookAt: [83, 4.0, -102],
      fov: 44,
      transitionDuration: 5,
      easing: "easeInOutCubic",
      idleDrift: { enabled: true, amplitude: 0.05, speed: 0.2 },
    },

    environment: {
      background: "#07050c",
      fog: { color: "#0f0a18", near: 6, far: 26 },
      ambientIntensity: 0.3,
      keyLight: { color: "#ffcf5e", intensity: 0.9, position: [83, 6, -95] },
      particles: { count: 900, color: "#a06bff", size: 0.014, speed: 0.15, spread: 12 },
    },

    visualState: {
      mode: "QKV_MATRIX_DOT",
      props: {
        sequenceLength: 6,
        dModel: 512,
        dK: 64,
        showDotProduct: true,
        showScaledSoftmax: true,
        qkvColors: { q: "#ffd479", k: "#c77dff", v: "#7dd6ff" },
      },
    },

    visualGuide: {
      headline: "A search engine running inside the model, for every word, at every layer",
      legend: [
        { color: "#ffd479", label: "Query: what this word is looking for" },
        { color: "#c77dff", label: "Key: what each word offers in return" },
        { color: "#7dd6ff", label: "Value: what actually gets passed on and blended" },
        { color: "#eaffb0", label: "The score grid, scaled by √64 and softmaxed into weights that sum to one" },
      ],
      takeaway:
        "Dot product, divide, softmax, blend the Values. Absurdly simple arithmetic, running billions of times over.",
    },

    script: [
      "[LOOK TO AUDIENCE] 'Self-attention' sounds abstract. What's underneath it is almost mechanical. [PAUSE 1s] So let's open it up.",
      "Every word, at every layer, gets turned into three separate things. A Query, a Key, and a Value. [EMPHASIS] Think of it as a tiny search engine running inside the model. For every word. At every layer. All at the same time.",
      "[TRIGGER 3D MORPH] So the Query is what this word is looking for. The Key is what each other word has to offer. You compare this word's Query against every other word's Key - a simple dot product - and you get a score for every possible pair of words in the sentence.",
      "Those scores get divided by the square root of the key dimension, and then [TRIGGER 3D MORPH] passed through softmax, which turns them into weights that add up to exactly one. [PAUSE 1s] Which is really just a way of asking, out of everything in this sentence, how much should I care about you?",
      "So why the square root? [PAUSE 1s] Because as that dimension grows, the raw dot products grow with it, and softmax gets pushed into a corner where its gradients flatten out to almost nothing. Which is the same vanishing-signal problem that crippled the recurrent loops. [EMPHASIS] That one scaling factor is small arithmetic doing real work.",
      "[EMPHASIS] [TRIGGER 3D MORPH] And then the last step. You use those weights to blend together the Values. Not the Queries, not the Keys. The Values. And what comes out is a brand new version of this word, carrying exactly the right amount of meaning borrowed from everywhere else in the sentence.",
      "[PAUSE 2s] And that happens for every word simultaneously, in one matrix multiplication. That's the entire mechanism. [EMPHASIS] Astonishingly simple arithmetic, run billions of times over, doing something that looks a great deal like understanding.",
    ],

    timelineYear: 2017,
    timelineLabel: "2017",
  },
  {
    id: "slide-17",
    index: 16,
    act: 3,
    title: "Multi-Head Attention & Positional Encoding",
    subtitle: "Many Perspectives at Once, Order Without a Loop",

    camera: {
      id: "slide-17-cam",
      position: [89, 6.5, -98],
      lookAt: [89, 4.5, -110],
      fov: 52,
      transitionDuration: 5.5,
      easing: "easeInOutSine",
      idleDrift: { enabled: true, amplitude: 0.09, speed: 0.28 },
    },

    environment: {
      background: "#08060e",
      fog: { color: "#110c1c", near: 8, far: 34 },
      ambientIntensity: 0.32,
      keyLight: { color: "#ffd479", intensity: 0.8, position: [89, 7, -100] },
      particles: { count: 1600, color: "#c77dff", size: 0.016, speed: 0.2, spread: 18 },
    },

    visualState: {
      mode: "MULTI_HEAD_RAYS",
      props: {
        headCount: 8,
        showPositionalEncoding: true,
        encodingType: "sinusoidal",
        subspaceCount: 8,
        orbitHighlight: true,
      },
    },

    visualGuide: {
      headline: "Eight independent heads, all on screen at once, plus a wave that restores order",
      legend: [
        { color: "#ffd479", label: "HEAD 1: coreference (pronoun → noun)" },
        { color: "#7dd6ff", label: "HEAD 2: adjacent word   ·   other heads: previous, next, long-range, start, syntax, diffuse" },
        { color: "#dce6ff", label: "Concatenated back into one 512-dim representation" },
        { color: "#eaffb0", label: "Sinusoidal positional encoding: without it, 'dog bit man' = 'man bit dog'" },
      ],
      takeaway:
        "Without positional encoding, 'the dog bit the man' and 'the man bit the dog' are mathematically identical to self attention.",
    },

    script: [
      "[PAUSE 1s] One attention head is powerful. The Transformer's authors don't stop at one. They run eight heads side by side, and every one of them gets its own separate, independently learned Query, Key and Value projections.",
      "[EMPHASIS] So why does that help? Because the heads specialise. [TRIGGER 3D MORPH] One might learn to track which pronoun refers to which noun. Another watches the word right next door. Another follows grammar across the sentence. Eight perspectives at once, and then you stitch them back into one.",
      "And the maths divides cleanly. The model carries five hundred and twelve numbers per word, split evenly across the eight, so each head works in its own sixty-four-number slice. [PAUSE 1s] Same mechanism we just watched, running eight times over, in parallel.",
      "But there's a problem hiding underneath all this parallel power. [PAUSE 1s] On its own, this mechanism has no idea what order the words came in. [EMPHASIS] Feed it 'the dog bit the man' and 'the man bit the dog', and every word-to-word comparison comes out identical. It's treating your sentence as a bag of words, not a sequence.",
      "And the fix is almost silly. Before anything else happens, [TRIGGER 3D MORPH] you add a wave onto each word. A sinusoidal signal, different frequencies layered across the vector, tagging every position with its own signature.",
      "[EMPHASIS] No recurrence required. No loop, no memory cell, no waiting. Just arithmetic, baked in once, before the first layer even runs. Word order is restored, and you keep every bit of the parallelism that made this architecture worth building.",
      "[LOOK TO AUDIENCE] [TRIGGER 3D MORPH] Now take that block - multi-head attention, a feedforward layer, position baked in underneath - and stack it. A dozen times. Two dozen. Ninety-six times. [PAUSE 2s] And that's the engine under everything that happens next.",
    ],

    timelineYear: 2017,
    timelineLabel: "2017",
  },
  {
    id: "slide-18",
    index: 17,
    act: 3,
    title: "The Decoder Path: GPT-1",
    subtitle: "Radford & Sutskever at OpenAI - Generative Pre-Training, June 2018",

    camera: {
      id: "slide-18-cam",
      position: [96, 3.0, -104],
      lookAt: [96, 3.0, -118],
      fov: 46,
      transitionDuration: 5,
      easing: "easeInOutCubic",
      idleDrift: { enabled: true, amplitude: 0.04, speed: 0.12 },
    },

    environment: {
      background: "#0a0710",
      fog: { color: "#140b16", near: 7, far: 30 },
      ambientIntensity: 0.28,
      keyLight: { color: "#ffb347", intensity: 0.9, position: [96, 5, -108] },
      particles: { count: 1000, color: "#ffb347", size: 0.015, speed: 0.22, spread: 14 },
    },

    visualState: {
      mode: "GPT_VS_BERT_SPLIT",
      props: {
        mode: "decoder-only",
        direction: "left-to-right",
        maskingType: "causal",
        paramCount: "117M",
        trainingCorpus: "BooksCorpus (~7,000 books)",
        activeSide: "GPT",
      },
    },

    visualGuide: {
      headline: "DECODER path: generate left to right, never look at the future",
      legend: [
        { color: "#ffcf5e", label: "Words appearing one at a time: the only training task is 'what comes next?'" },
        { color: "#1a1208", label: "Causal mask: the future is blacked out. Never look ahead." },
        { color: "#ff9d4d", label: "Attention arcs that only reach BACKWARD from the cursor" },
        { color: "#ffd479", label: "Twelve stacked decoder layers · 117M parameters · BooksCorpus" },
      ],
      takeaway:
        "No labels, no supervision. Just 'what word comes next?', asked billions of times across seven thousand little-known e-books.",
    },

    script: [
      "June 2018. OpenAI. A small team led by Alec Radford takes half of those two towers. [PAUSE 1s] Just half. The decoder. The writer. And one of the authors on that paper is Ilya Sutskever - the same Sutskever behind the sequence-to-sequence work we saw four slides ago.",
      "[EMPHASIS] [TRIGGER 3D MORPH] They stack it twelve layers deep, and bolt on one rule. Causal masking. Every word is only allowed to look backwards, at the words already generated. Never forwards. Never at what's coming.",
      "[TRIGGER 3D MORPH] And the training task is almost insultingly simple. Read some text, predict the next word. Then read that word, and predict the one after it. Over and over, across hundreds of millions of words - much of it a corpus of seven thousand unpublished books.",
      "[EMPHASIS] No labels. Nobody telling it what correct looks like. Just: what word comes next? And out of that one repetitive question, asked billions of times, something unexpected starts to emerge. A rough grasp of grammar. Of fact. Of how sentences tend to unfold.",
      "And that two-stage recipe becomes the template nearly every major language model still follows. Pre-train broadly on raw text first. Then fine-tune narrowly on one specific task. [PAUSE 1s] A hundred and seventeen million parameters. Modest, by the standards of what's coming.",
      "GPT-1 improves the state of the art on nine of the twelve benchmarks they test it on. Solid. Respectable. [PAUSE 1s] And largely unnoticed outside a narrow research community. Nobody is calling this a turning point yet - not even the people who built it. That verdict arrives later, in hindsight.",
      "[LOOK TO AUDIENCE] So GPT reads the world in one direction. Forward, always forward, generating what comes next. [PAUSE 2s] Four months later, a different team asks a completely different question. What if you read in both directions at once?",
    ],

    timelineYear: 2018,
    timelineLabel: "June 2018",
  },
  {
    id: "slide-19",
    index: 18,
    act: 3,
    title: "The Encoder Path: BERT",
    subtitle: "Jacob Devlin at Google - Deep Bidirectional Context, October 2018",
    camera: {
      id: "slide-19-cam",
      position: [103, 3.0, -110],
      lookAt: [103, 3.0, -124],
      fov: 46,
      transitionDuration: 5,
      easing: "easeInOutSine",
      idleDrift: { enabled: true, amplitude: 0.04, speed: 0.12 },
    },

    environment: {
      background: "#0a0812",
      fog: { color: "#130c1e", near: 7, far: 30 },
      ambientIntensity: 0.3,
      keyLight: { color: "#b46aff", intensity: 0.9, position: [103, 5, -112] },
      particles: { count: 1200, color: "#b46aff", size: 0.015, speed: 0.2, spread: 16 },
    },

    visualState: {
      mode: "GPT_VS_BERT_SPLIT",
      props: {
        mode: "encoder-only",
        direction: "bidirectional",
        maskingType: "masked-language-model",
        paramCount: "340M (BERT-Large)",
        trainingObjective: "MLM + Next Sentence Prediction",
        activeSide: "BERT",
      },
    },

    visualGuide: {
      headline: "ENCODER path: the causal mask is gone. Every word sees every word.",
      legend: [
        { color: "#a06bff", label: "The same matrix as GPT, now a full square: no triangle, both directions" },
        { color: "#120a1e", label: "[MASK]: about 15% of tokens, blanked at random" },
        { color: "#dcc6ff", label: "Filled back in from LEFT and RIGHT at once" },
        { color: "#ffd479", label: "'bank' on stage: riverbank, because both sides of it are allowed to speak" },
      ],
      takeaway:
        "Word2Vec's 'bank' can finally mean two things. Two halves of the same 2017 paper: one learns to write, one learns to understand.",
    },

    script: [
      "October 2018. Google, this time - a team led by Jacob Devlin. [PAUSE 1s] They take the other tower. The encoder. The reader. And they remove the causal mask entirely.",
      "[EMPHASIS] [TRIGGER 3D MORPH] So now every word can see every other word. The ones before it, and the ones after it. Full context, both directions, at every single layer.",
      "But that creates an immediate problem. If a word can already see itself from the other direction, then predicting the next word is trivial. The model just cheats and looks ahead. [PAUSE 1s] So Devlin's team invents a different game.",
      "[EMPHASIS] [TRIGGER 3D MORPH] They blank out about fifteen percent of the words at random, then train the model to fill in the gaps using everything on both sides of each blank. Masked Language Modelling. [PAUSE 1s] A fill-in-the-blank test, run billions of times. And they call the model BERT.",
      "[LOOK TO AUDIENCE] [TRIGGER 3D MORPH] Now remember that 'bank' from word2vec, stuck at a single point? Watch it on the stage. [PAUSE 1s] Here it can finally mean two different things - a riverbank, a savings account - because the words on either side of it are finally allowed to speak.",
      "BERT trains on one more task alongside that. Given two sentences, predict whether the second genuinely follows the first, or was swapped in from somewhere else. A coarse but useful lesson in how sentences relate. [PAUSE 1s] And on GLUE - the standard suite of language-understanding tasks - BERT's average jumps more than seven points over the previous best. A big enough leap that competing labs tore up entire research roadmaps to catch up.",
      "And that forces something genuinely different from GPT's forward march. A deep, simultaneous grasp of context, instead of a left-to-right guess at what comes next. [PAUSE 1s] The results are close to unprecedented. State of the art across nearly every major language benchmark, almost overnight.",
      "[LOOK TO AUDIENCE] Two halves of the same 2017 paper. [PAUSE 1s] One learns to write, reading only forward. One learns to understand, reading in every direction at once. [PAUSE 2s] And both of them speak the same underlying language of attention.",
    ],

    timelineYear: 2018,
    timelineLabel: "Oct 2018",
  },
  {
    id: "slide-20",
    index: 19,
    act: 3,
    title: "The Modern Horizon",
    subtitle: "Scaling Laws - From Task Engineering to Foundational Prediction",

    camera: {
      id: "slide-20-cam",
      position: [110, 7.4, -126],
      lookAt: [110, 6.6, -140],
      fov: 38,
      transitionDuration: 6,
      easing: "easeInOutSine",
      idleDrift: { enabled: true, amplitude: 0.05, speed: 0.08 },
    },

    environment: {
      background: "#050308",
      fog: { color: "#0c0716", near: 20, far: 90 },
      ambientIntensity: 0.5,
      keyLight: { color: "#ffd24a", intensity: 1.3, position: [110, 20, -125] },
      particles: { count: 3000, color: "#c77dff", size: 0.02, speed: 0.12, spread: 50 },
    },

    visualState: {
      mode: "SCALING_HORIZON",
      props: {
        scalingLawSlope: "power-law",
        paramRange: "10^6 to 10^12+",
        horizonLabel: "next token prediction",
        cathedralLayerCount: 36,
        finalReveal: true,
        scalingCitation: "Kaplan et al., 2020",
      },
    },

    visualGuide: {
      headline: "The curve doesn't bend, and there's no ceiling in sight",
      legend: [
        { color: "#ffd24a", label: "Apex, 2020: Kaplan - test loss falls as a straight line on a log-log plot" },
        { color: "#b46aff", label: "The shaft: ninety-six layers, gold at 1950 climbing to violet at the present" },
        { color: "#cfd8ff", label: "Pinned by year: Turing 1950 at the base, XOR 1969, MYCIN/XCON 1980s" },
      ],
      takeaway:
        "Stop engineering the task. Build one general architecture, make it enormous, and predict the next token.",
    },

    script: [
      "Then researchers start noticing a pattern that has nothing to do with clever architecture at all. [EMPHASIS] Make the model bigger. Give it more data. Give it more compute. And performance improves. Not randomly, not occasionally, but smoothly and predictably. [PAUSE 1s] [TRIGGER 3D MORPH] In 2020, Jared Kaplan's group at OpenAI measured it. Test loss falls as a power law in parameters, data and compute - a straight line on a log-log plot. No cliff. No sudden gift. Later papers argued about the slope, never about whether the line was there.",
      "[TRIGGER 3D MORPH] So watch the curve run out into the distance. Layer after layer of this architecture, stacking, multiplying, going far past the edge of the room. And no ceiling anywhere in sight.",
      "[EMPHASIS] And that changes how the whole field thinks. Decades of hand-crafting the right architecture for the right task - grammar rules, expert systems, all the way back to [TRIGGER 3D MORPH] MYCIN and XCON, those hand-written rule systems from the 1980s - start giving way to something simpler and far more audacious. Build one general architecture. Make it enormous. Let it learn everything from the raw shape of language.",
      "[PAUSE 1s] [TRIGGER 3D MORPH] Now think about the distance we've covered. A room in 1950, two closed doors, and a question nobody could settle. Can machines think? A proof in 1969 that one layer of artificial neurons could never learn - and the decade of frozen funding that came after it. A translation system in 2014, trying to force a whole paragraph through one short list of numbers. [EMPHASIS] Every wall. Every winter. Every time the money walked away. All of it lands right here, on a single idea. Predict the next word, at staggering scale, and something that looks remarkably like understanding falls out the other side.",
      "[LOOK TO AUDIENCE] [PAUSE 2s] Turing never got his answer. Not really. [EMPHASIS] But seventy years on, standing inside this [TRIGGER 3D MORPH] cathedral of attention - layer after layer, glowing gold and violet as far as you can see - we're finally close enough to ask his question again and actually mean it. [PAUSE 3s] Can machines think? [PAUSE 2s] Let's find out what they do next.",
    ],

    timelineYear: 2020,
    timelineLabel: "2020s →",
  },
];
