import type { SlideData } from "./types";

export const ACT_II_SLIDES: SlideData[] = [
  {
    id: "slide-7",
    index: 6,
    act: 2,
    title: "The Backpropagation Revival",
    subtitle: "Rumelhart, Hinton & Williams - Learning Hidden Representations, 1986",

    camera: {
      id: "slide-7-cam",
      position: [30, 5.0, -34],
      lookAt: [30, 3.0, -44],
      fov: 46,
      transitionDuration: 6,
      easing: "easeOutExpo",
      idleDrift: { enabled: true, amplitude: 0.07, speed: 0.15 },
    },

    environment: {
      background: "#070b12",
      fog: { color: "#0a121c", near: 8, far: 36 },
      ambientIntensity: 0.28,
      keyLight: { color: "#39d6c8", intensity: 0.85, position: [30, 7, -30] },
      particles: { count: 1000, color: "#39d6c8", size: 0.018, speed: 0.2, spread: 14 },
    },

    visualState: {
      mode: "BACKPROP_GRAPH",
      props: {
        layerSizes: [2, 2, 1],
        showXORSolved: true,
        gradientFlowDirection: "backward",
        chainRuleHighlight: true,
        activationFn: "sigmoid",
      },
    },

    visualGuide: {
      headline: "The chain rule, walked backward through a hidden layer",
      legend: [
        { color: "#39d6c8", label: "Forward pass: inputs sweeping left to right to a prediction" },
        { color: "#ff9d4d", label: "Backward pass: the error walking back, nudging every weight it passes" },
        { color: "#7dffb0", label: "XOR, solved: the 1969 wall, gone" },
      ],
      takeaway:
        "A network with just one hidden layer, trained this way, solves XOR trivially. The wall was only ever a wall for a single layer.",
    },

    script: [
      "[LOOK TO AUDIENCE] At the end of the last act, one point of light was still flickering away in the corner. You may not have caught it. [PAUSE 2s] It's about to wake up.",
      "[PAUSE 1s] While XCON is still saving forty million a year, a way to train stacked layers of artificial neurons is quietly getting worked out in another building.",
      "1986. David Rumelhart, Geoffrey Hinton and Ronald Williams publish a paper in Nature, and the title is too modest for what it does. 'Learning representations by back-propagating errors.' [EMPHASIS] This isn't the first time anyone has found the idea. It's the first time the field notices.",
      "Paul Werbos had sketched a version of it in a thesis back in 1974. Yann LeCun landed on pieces of the same thing independently, a few years later. [PAUSE 1s] That happens a lot in this story. Good ideas get invented, ignored, then reinvented, until the field is ready to hear them. And 1986 is that moment.",
      "So what's the breakthrough? Stack more than one layer of artificial neurons, and the network stops being a simple map from input to output. [EMPHASIS] The middle layers start inventing their own features. Useful patterns that nobody programmed in, and nobody even named.",
      "[TRIGGER 3D MORPH] And the method is just the chain rule from first-year calculus, applied with enormous patience. Measure how wrong the answer was. Ask how much each connection contributed to that mistake. Then walk that answer backwards through the network, one layer at a time, nudging every weight closer to right.",
      "[EMPHASIS] [TRIGGER 3D MORPH] Now, the payoff. Remember the wall from 1969? The one built into the geometry, the proof that ended a decade of funding? A network with a single extra layer in the middle, trained this way, solves it. Easily. [PAUSE 1s] It was only ever a wall for one layer.",
      "[PAUSE 1s] This isn't an overnight revolution. Computers in 1986 are painfully slow, and training takes more patience than most researchers have. [LOOK TO AUDIENCE] But the thaw has started. And the harder question is still wide open. What could a network like this ever do with something as slippery as language?",
    ],

    timelineYear: 1986,
    timelineLabel: "1986",
  },
  {
    id: "slide-8",
    index: 7,
    act: 2,
    title: "The Curse of Dimensionality",
    subtitle: "Statistical N-Grams and the Limits of Counting Words, Late 1990s",

    camera: {
      id: "slide-8-cam",
      position: [36, 3.2, -40],
      lookAt: [36, 2.0, -50],
      fov: 48,
      transitionDuration: 4.5,
      easing: "easeInOutCubic",
      idleDrift: { enabled: true, amplitude: 0.03, speed: 0.3 },
    },

    environment: {
      background: "#0a0d10",
      fog: { color: "#0d1216", near: 5, far: 20 },
      ambientIntensity: 0.2,
      keyLight: { color: "#7a8a95", intensity: 0.4, position: [36, 5, -38] },
      particles: { count: 2600, color: "#5a6b78", size: 0.008, speed: 0.02, spread: 18 },
    },

    visualState: {
      mode: "NGRAM_LATTICE",
      props: {
        vocabularySize: 50000,
        ngramOrder: 3,
        sparsityRatio: 0.998,
        smoothingOverlay: "Kneser-Ney",
        latticeDensity: "explosive",
      },
    },

    visualGuide: {
      headline: "Connectionism can learn again. Language, in the 1990s, is still a lookup table.",
      legend: [
        { color: "#8fa6b8", label: "Left: the handful of trigrams a corpus actually saw, inside an empty box of 10¹⁴ possibles" },
        { color: "#4a5560", label: "The wireframe is the possibility space - not a filled lattice of every trigram" },
        { color: "#ff9d4d", label: "Right: a rhyme, not the cause - volume also flees to the corners as dimensions climb" },
      ],
      takeaway:
        "The space of possibilities explodes far faster than any dataset can fill it. And to this model, 'cat' is as unrelated to 'dog' as to 'refrigerator'.",
    },

    script: [
      "[EMPHASIS] So networks can learn again. Language, meanwhile, is still a lookup table. [PAUSE 1s] Through the 1990s, the dominant approach to language is almost defiantly unglamorous. It's counting.",
      "They're called n-gram models, and the idea is pure brute frequency. [EMPHASIS] To guess the next word, look at the one or two words in front of it. Then go through a huge pile of text and ask what word usually came next. Build the table. Look it up.",
      "It isn't a new idea, either. Claude Shannon - the same Shannon from that Dartmouth table - played with predicting letters and words this way back in 1948, as a parlour trick about information. [PAUSE 1s] Fifty years on, with computers fast enough to count at scale, that parlour trick becomes the quiet engine behind spell-checkers, search engines, and the first speech recognisers that actually work.",
      "[TRIGGER 3D MORPH] Now do the arithmetic. A modest vocabulary of fifty thousand words gives you two and a half billion possible word pairs. Go to three words in a row and you're into the trillions. Most of those combinations never appear. Not once. Not in the biggest pile of text anybody can assemble. [PAUSE 1s] [TRIGGER 3D MORPH] That's the curse of dimensionality. The space of possibilities grows far faster than any dataset can fill it.",
      "Researchers patch the holes with something called smoothing. [TRIGGER 3D MORPH] Statistical tricks for guessing at probabilities the table never actually saw. [EMPHASIS] Useful. Necessary, even. But not a fix. It's a bandage on a wound that reopens every time the vocabulary grows.",
      "And underneath that bandage, a deeper problem sits untouched. To a model like this, every word is just a symbol. A slot in a table. [EMPHASIS] 'Cat' is exactly as unrelated to 'dog' as it is to 'refrigerator.' No shared meaning. No sense of similarity. Only counts.",
      "[LOOK TO AUDIENCE] So you've got a system straining under the very vocabulary it's supposed to master. [PAUSE 2s] And somewhere, someone is about to ask a much stranger question. What if a word didn't have to be a symbol at all?",
    ],

    timelineYear: 1997,
    timelineLabel: "Late 1990s",
  },
  {
    id: "slide-9",
    index: 8,
    act: 2,
    title: "A Neural Probabilistic Language Model",
    subtitle: "Yoshua Bengio - Words Become Vectors, 2003",

    camera: {
      id: "slide-9-cam",
      position: [42, 5.4, -46],
      lookAt: [42, 3.4, -57],
      fov: 40,
      transitionDuration: 5,
      easing: "easeInOutSine",
      idleDrift: { enabled: true, amplitude: 0.06, speed: 0.08 },
    },

    environment: {
      background: "#080b10",
      fog: { color: "#0c1420", near: 8, far: 55 },
      ambientIntensity: 0.3,
      keyLight: { color: "#f0b46a", intensity: 0.5, position: [42, 6, -50] },
      particles: { count: 1400, color: "#4fd8ff", size: 0.016, speed: 0.1, spread: 20 },
    },

    visualState: {
      mode: "VECTOR_EMBEDDING_SPACE",
      props: {
        embeddingDims: 50,
        wordCount: 800,
        selfOrganizeSpeed: 0.4,
        clusterFormation: true,
      },
    },

    visualGuide: {
      headline: "Every word becomes a point in continuous space, and the positions are learned",
      legend: [
        { color: "#6d7dff", label: "The vocabulary: one point per word, scattered at random, then drifting" },
        { color: "#7dffb0", label: "Neighborhoods that form from similar usage - animals, places, people" },
        { color: "#eaffb0", label: "cat and dog: neighbors nobody labelled" },
      ],
      takeaway:
        "Nobody tells the model that 'cat' and 'dog' are related. The geometry discovers it, because both keep appearing in the same kinds of sentences.",
    },

    script: [
      "2003. Montreal. Yoshua Bengio and his collaborators ask exactly that. [PAUSE 1s] What if a word wasn't a slot in a table, but a place? A point in space, pinned down by fifty or a hundred numbers.",
      "[EMPHASIS] [TRIGGER 3D MORPH] And the trick is that nobody chooses those numbers. They start out random. A neural network works them out for itself while it's learning to predict the next word, sliding each word around until the predictions get better.",
      "[TRIGGER 3D MORPH] The design is almost embarrassingly plain in hindsight. Look up each word's numbers. Feed them into one ordinary layer of neurons. Predict the next word. [PAUSE 1s] That's the whole architecture.",
      "[TRIGGER 3D MORPH] Now watch what happens as it trains. Words that get used in similar ways drift towards each other. Nobody told this model that 'cat' and 'dog' are related. [PAUSE 1s] The geometry works it out, because both words keep turning up in the same kinds of sentences.",
      "[EMPHASIS] [TRIGGER 3D MORPH] And that heals the wound from the last slide. The model can generalise now. Train it on 'the cat sat on the mat', and it quietly gets more confident about 'the dog sat on the mat' - a sentence it has never seen - because by now cat and dog are neighbours.",
      "It doesn't take over the field, though. Training this on 2003 hardware is brutally slow. Days of computing for something a modern laptop finishes before your coffee is ready. [PAUSE 1s] The idea is ahead of the machines that could run it.",
      "[LOOK TO AUDIENCE] [TRIGGER 3D MORPH] So the seed goes into the ground. A word as a place. Meaning as geometry. And it waits. [PAUSE 2s] Ten years later, somebody strips this same idea down to something almost absurdly simple, and the whole field changes in a season.",
    ],

    timelineYear: 2003,
    timelineLabel: "2003",
  },
  {
    id: "slide-10",
    index: 9,
    act: 2,
    title: "Word2Vec",
    subtitle: "Tomas Mikolov - King minus Man plus Woman equals Queen, 2013",

    camera: [
      {
        id: "slide-10-cam-1",
        position: [48, 10.0, -38],
        lookAt: [48, 5.0, -64],
        fov: 56,
        transitionDuration: 3.5,
        easing: "easeOutExpo",
      },
      {
        id: "slide-10-cam-2",
        position: [48, 7.4, -48],
        lookAt: [48, 5.0, -64],
        fov: 52,
        transitionDuration: 5.5,
        easing: "easeInOutCubic",
        idleDrift: { enabled: true, amplitude: 0.08, speed: 0.08 },
      },
    ],

    environment: {
      background: "#06070a",
      fog: { color: "#0a0e18", near: 8, far: 58 },
      ambientIntensity: 0.4,
      keyLight: { color: "#ffb347", intensity: 0.9, position: [48, 8, -58] },
      particles: { count: 1800, color: "#4fe0ff", size: 0.02, speed: 0.25, spread: 24 },
    },

    visualState: {
      mode: "WORD2VEC_MANIFOLD",
      props: {
        embeddingDims: 300,
        arithmeticDemo: { a: "King", b: "Man", c: "Woman", result: "Queen" },
        architecture: "skip-gram",
        trainingCorpusWords: "1.6 billion",
        vectorArrowHighlight: true,
      },
    },

    visualGuide: {
      headline: "King − Man + Woman lands on Queen",
      legend: [
        { color: "#eaffb0", label: "The learned direction, drawn from King to Man…" },
        { color: "#ffe08a", label: "…translated to Woman, and arriving on Queen" },
        { color: "#6d7dff", label: "Three million words in 300 dimensions, trained in hours on ordinary hardware" },
        { color: "#ff5c6a", label: "'Bank': one point, one vector, both meanings" },
      ],
      takeaway:
        "Directions in this space consistently mean things, and nobody programmed a single one of them. But context still isn't in the picture.",
    },

    script: [
      "2013. Google. A researcher named Tomas Mikolov looks at Bengio's decade-old idea and asks what happens if you throw away almost all of it. [PAUSE 1s] Keep the word positions. Delete the slow, expensive machinery wrapped around them.",
      "[EMPHASIS] The result is called word2vec, and it is fast. Fast enough to train on billions of words, on ordinary hardware, in hours instead of weeks. And the entire task is this: guess a word from its neighbours, or guess the neighbours from the word.",
      "They train it on about a billion and a half words of news text, and a three-million-word vocabulary settles into place in an afternoon, on a machine under somebody's desk. [PAUSE 1s] Bengio's version took days, on a fraction of the data. That jump in practicality alone is why this is the moment the idea escapes academia and lands in industry, everywhere at once.",
      "[TRIGGER 3D MORPH] Then you plot the results, and something startling shows up. Directions in this space start to mean things. Consistently. The step that takes you from 'man' to 'woman' looks, geometrically, like the same step wherever you try it.",
      "[EMPHASIS] [TRIGGER 3D MORPH] So try the arithmetic yourself. Take the point for King. Subtract Man. Add Woman. [PAUSE 2s] The closest point in the entire vocabulary is Queen. Nobody programmed that. It fell out of guessing neighbouring words, at scale.",
      "The demonstration captivates everyone. Capital cities. Verb tenses. Singular and plural. All of them sitting as consistent directions in the same space, reachable with nothing but addition and subtraction. [PAUSE 1s] Meaning, suddenly, has geometry.",
      "[LOOK TO AUDIENCE] [TRIGGER 3D MORPH] But listen for the crack under the applause. Every word gets exactly one point. 'Bank' sits in one place whether you mean the side of a river or the place that holds your money. [PAUSE 2s] Context still isn't in the picture. And that gap stays open for a few more years.",
    ],

    timelineYear: 2013,
    timelineLabel: "2013",
  },
  {
    id: "slide-11",
    index: 10,
    act: 2,
    title: "The Recurrent Loop",
    subtitle: "RNNs, and Hochreiter & Schmidhuber's Long Short-Term Memory",

    camera: {
      id: "slide-11-cam",
      position: [54, 4.5, -62],
      lookAt: [54, 3.0, -72],
      fov: 44,
      transitionDuration: 5,
      easing: "easeInOutCubic",
      idleDrift: { enabled: true, amplitude: 0.12, speed: 0.35 },
    },

    environment: {
      background: "#080a0d",
      fog: { color: "#0c1116", near: 6, far: 30 },
      ambientIntensity: 0.26,
      keyLight: { color: "#ff9d4d", intensity: 0.6, position: [54, 5, -66] },
      particles: { count: 1000, color: "#4fd8ff", size: 0.015, speed: 0.3, spread: 12 },
    },

    visualState: {
      mode: "RNN_UNROLL",
      props: {
        timeSteps: 12,
        cellType: "LSTM",
        showMemoryCell: true,
        gates: ["input", "forget", "output"],
        loopHighlight: true,
      },
    },

    visualGuide: {
      headline: "Rewind. Word2Vec still has no sequence. To give language a memory, we go back to the 1990s.",
      legend: [
        { color: "#4fd8ff", label: "One recurrent cell, feeding its own output back in: then unrolled once per word" },
        { color: "#ffcf5e", label: "The LSTM memory cell: a conveyor belt running the length of the sequence" },
        { color: "#ffffff", label: "Input / forget / output gates, deciding what to write, erase and reveal" },
        { color: "#3a3f45", label: "The earliest steps, already fading: Hochreiter's 1991 result" },
      ],
      takeaway:
        "Watch the timeline jump backward. In theory the loop remembers arbitrarily far back. In practice it forgets almost immediately, which is exactly what the gates exist to fix.",
    },

    script: [
      "[LOOK TO AUDIENCE] Word2vec still only looks at a small window of words. So did Bengio's model. So did the n-gram tables. [EMPHASIS] So to give language a memory, we have to rewind. Watch the timeline - we're going from 2013 back to the 1990s. [PAUSE 1s] Meaning doesn't sit in a window. It builds up. Across a sentence, a paragraph, a whole story.",
      "So researchers try a different shape of network. [TRIGGER 3D MORPH] One that loops. A recurrent network reads a word, then feeds its own output back in as part of the input for the next word. So it carries something forward at every step. A running memory of everything it has read so far.",
      "[TRIGGER 3D MORPH] In theory, that loop can remember as far back as you like. [PAUSE 1s] [TRIGGER 3D MORPH] In practice it forgets almost immediately - as a young researcher named Sepp Hochreiter showed in his 1991 thesis. The memory fades far faster than anyone had realised.",
      "[EMPHASIS] [TRIGGER 3D MORPH] So in 1997, Hochreiter and his supervisor Jürgen Schmidhuber come back with a new design. Long Short-Term Memory. LSTM. You give the loop a dedicated memory cell - think of it as a conveyor belt running the length of the sentence, mostly undisturbed by the noise around it.",
      "And then, for years, almost nothing happens. Training even a modest LSTM strains the hardware of the late 1990s. [PAUSE 1s] It takes until the 2010s, with graphics chips and much bigger datasets, before anyone can show what these gated loops really do. Generating handwriting. Transcribing speech. Translating text. All of it by learning what's worth remembering.",
      "Three gates control that conveyor belt. An input gate decides what new information is worth writing down. A forget gate decides what old information can finally be erased. An output gate decides what to reveal right now. [EMPHASIS] And all three are learned. None of them are hand-coded.",
      "[LOOK TO AUDIENCE] So for the first time, a network can carry context across dozens, sometimes hundreds, of words. [PAUSE 2s] Translation, transcription, generation - all of it is about to shift. But this loop comes with a bill. And it comes due on the next slide.",
    ],

    timelineYear: 1997,
    timelineLabel: "◀ 1991–97",
  },
  {
    id: "slide-12",
    index: 11,
    act: 2,
    title: "The Vanishing Gradient",
    subtitle: "Backpropagation Through Time and the Memory Wall",

    camera: {
      id: "slide-12-cam",
      position: [60, 3.0, -68],
      lookAt: [60, 1.8, -78],
      fov: 42,
      transitionDuration: 5,
      easing: "easeInOutQuint",
      idleDrift: { enabled: true, amplitude: 0.04, speed: 0.08 },
    },

    environment: {
      background: "#07080a",
      fog: { color: "#0a0b0d", near: 4, far: 16 },
      ambientIntensity: 0.12,
      keyLight: { color: "#8a6a4d", intensity: 0.25, position: [60, 4, -72] },
      particles: { count: 500, color: "#3a3f45", size: 0.01, speed: 0.03, spread: 10 },
    },

    visualState: {
      mode: "GRADIENT_DECAY_FIELD",
      props: {
        sequenceLength: 100,
        decayRate: 0.85,
        gradientMagnitudeOverlay: true,
        memoryWallDistance: 50,
      },
    },

    visualGuide: {
      headline: "Multiply by 0.85, fifty times over",
      legend: [
        { color: "#ff9d4d", label: "The gradient, relaunched from the final step and walking backward" },
        { color: "#3a3f45", label: "Steps the signal can no longer reach: arithmetically indistinguishable from zero" },
        { color: "#8a6a4d", label: "The memory wall, at the step where there is nothing left to learn from" },
      ],
      takeaway:
        "The network isn't choosing to forget the beginning of a long sequence. Mathematically, it cannot learn from it.",
    },

    script: [
      "[PAUSE 1s] So how do you actually train one of these loops? You unroll it. You run the same little network once per word in the sentence, then walk the error backwards through every single one of those steps. Backpropagation through time.",
      "[TRIGGER 3D MORPH] And this is where the maths turns hostile. At every step backwards, the gradient - the signal telling earlier weights how to improve - gets multiplied again. By the same recurrent weights. And by a number that's almost always comfortably less than one.",
      "[EMPHASIS] Multiply a number smaller than one by itself fifty times, and what you're left with is indistinguishable from zero. That's not a metaphor. That's literally the arithmetic of the vanishing gradient. By the time the signal reaches word fifty of a long passage, there's nothing left of it. Nothing left to learn from.",
      "[TRIGGER 3D MORPH] So the network isn't choosing to forget the beginning of a long passage. [PAUSE 1s] It mathematically cannot learn from it. Researchers start calling this ceiling the memory wall. And even LSTMs, for all their gates, only push that wall further out. They don't remove it.",
      "There's a mirror image of this problem too. [TRIGGER 3D MORPH] Sometimes the gradient explodes instead of vanishing, running away towards infinity - and the fix is simply to clip it before it tears the training apart. [EMPHASIS] Neither problem goes away with more data or a bigger network. Both are baked into recurrence itself. Every extra step is another multiplication that can destroy the signal.",
      "[LOOK TO AUDIENCE] So what this field needs is a design where information doesn't have to survive a hundred multiplications just to be remembered. [PAUSE 2s] And one is coming. It solves exactly this problem. And it creates a brand new one of its own.",
    ],

    timelineYear: 1991,
    timelineLabel: "◀ 1991",
  },
  {
    id: "slide-13",
    index: 12,
    act: 2,
    title: "The Sequence-to-Sequence Bottleneck",
    subtitle: "Sutskever & Cho - One Vector to Hold an Entire Sentence, 2014",
    camera: {
      id: "slide-13-cam",
      position: [65, 2.5, -70],
      lookAt: [65, 2.4, -84],
      fov: 46,
      transitionDuration: 6,
      easing: "easeInOutQuint",
      idleDrift: { enabled: true, amplitude: 0.03, speed: 0.05 },
    },

    environment: {
      background: "#050506",
      fog: { color: "#08090b", near: 10, far: 36 },
      ambientIntensity: 0.22,
      keyLight: { color: "#c5d0dc", intensity: 0.45, position: [65, 6, -74] },
      particles: { count: 400, color: "#4a5560", size: 0.01, speed: 0.08, spread: 12 },
    },

    visualState: {
      mode: "SEQ2SEQ_BOTTLENECK",
      props: {
        contextVectorDims: 1000,
        encoderSteps: 7,
        decoderSteps: 6,
        bottleneckStress: 0.95,
        longSentenceDegradation: true,
      },
    },

    visualGuide: {
      headline: "Encoder → one 1,000-number vector → decoder. That's the whole architecture.",
      legend: [
        { color: "#4fd8ff", label: "Encoder: reads the French source, then those states are discarded" },
        { color: "#e8eef6", label: "Context vector: a small box of 1,000 numbers. All the decoder ever gets." },
        { color: "#ff9d4d", label: "Decoder: generates English with no access to the original words" },
        { color: "#ff4d6a", label: "A 500-word paragraph forced through the same box, overflowing" },
      ],
      takeaway:
        "Five words fit with room to spare. Five hundred don't, and translation quality measurably collapses as sentences grow.",
    },

    script: [
      "2014. Two research groups land on the same answer within months of each other, working independently. Ilya Sutskever's team at Google, and Kyunghyun Cho's team in Bengio's lab. [PAUSE 1s] They call it sequence-to-sequence.",
      "[TRIGGER 3D MORPH] The first network is the encoder - the reader. It goes through the source sentence one word at a time, updating its memory at every step. And when it reaches the end, whatever is left in that memory becomes a single fixed-size list of numbers. [EMPHASIS] The context vector. The whole sentence, compressed into one point.",
      "The second network is the decoder - the writer. It gets that vector, and nothing else. No access to the original words at all. And from it, it produces the output sentence, one word at a time. Translated, summarised, whatever the job is.",
      "[EMPHASIS] And for 2014, the results are stunning. Translation learned end to end, without a single hand-written grammar rule, starts matching and then beating twenty years of painstaking statistical systems. [PAUSE 1s] A whole era of language technology launches right here.",
      "But the flaw is in the design, not the details. [PAUSE 1s] Squeeze a five-word sentence into a thousand-number vector, and there's room to spare. [EMPHASIS] [TRIGGER 3D MORPH] Squeeze a five-hundred-word paragraph into that same thousand-number vector, [PAUSE 2s] and something has to give. Translation quality visibly falls apart as sentences get longer.",
      "[LOOK TO AUDIENCE] The entire meaning of a paragraph, forced through the eye of one needle. [PAUSE 2s] So what if the decoder didn't have to rely on that one vector? What if it could look back at any part of the input, at any moment, whenever it needed to? [PAUSE 2s] That question is Act Three.",
    ],

    timelineYear: 2014,
    timelineLabel: "2014",
  },
];
