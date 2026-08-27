import type { SlideData, Vec3 } from "../presentation/types";
import AttentionVisualizer from "./AttentionVisualizer";
import DimensionalityCollapseVisualizer from "./DimensionalityCollapseVisualizer";
import EarlyAIVisualizer from "./EarlyAIVisualizer";
import PerceptronVisualizer from "./PerceptronVisualizer";
import PretrainingPathsVisualizer from "./PretrainingPathsVisualizer";
import ScalingHorizonVisualizer from "./ScalingHorizonVisualizer";
import SequenceVisualizer from "./SequenceVisualizer";
import VectorSpaceVisualizer from "./VectorSpaceVisualizer";

export default function VisualizerFor({ slide, anchor }: { slide: SlideData; anchor: Vec3 }) {
  const { mode, props } = slide.visualState;

  switch (mode) {
    case "PERCEPTRON_NET":
      return <PerceptronVisualizer mode="PERCEPTRON" params={props} position={anchor} />;
    case "XOR_HYPERPLANE":
      return <PerceptronVisualizer mode="XOR_HYPERPLANE" params={props} position={anchor} />;
    case "WINTER_VOID":
      return <PerceptronVisualizer mode="AI_WINTER" params={props} position={anchor} />;

    case "VECTOR_EMBEDDING_SPACE":
      return <VectorSpaceVisualizer activeAnalogy={false} params={props} position={anchor} />;
    case "WORD2VEC_MANIFOLD":
      return <VectorSpaceVisualizer activeAnalogy params={props} position={anchor} />;

    case "BAHDANAU_ATTENTION":
      return <AttentionVisualizer scene="BAHDANAU" params={props} position={anchor} />;
    case "TRANSFORMER_ARCHITECTURE_3D":
      return <AttentionVisualizer scene="TRANSFORMER" params={props} position={anchor} />;
    case "QKV_MATRIX_DOT":
      return <AttentionVisualizer scene="QKV" params={props} position={anchor} />;
    case "MULTI_HEAD_RAYS":
      return <AttentionVisualizer scene="MULTI_HEAD" params={props} position={anchor} />;

    case "TURING_MACHINE":
      return <EarlyAIVisualizer mode="TURING_MACHINE" params={props} position={anchor} />;
    case "EXPERT_SYSTEM_LATTICE":
      return <EarlyAIVisualizer mode="EXPERT_SYSTEM_LATTICE" params={props} position={anchor} />;

    case "BACKPROP_GRAPH":
      return <SequenceVisualizer mode="BACKPROP_GRAPH" params={props} position={anchor} />;
    case "NGRAM_LATTICE":
      return (
        <>
          <SequenceVisualizer mode="NGRAM_LATTICE" params={props} position={anchor} />
          <DimensionalityCollapseVisualizer params={props} position={[4.2, 0.15, 0]} />
        </>
      );
    case "RNN_UNROLL":
      return <SequenceVisualizer mode="RNN_UNROLL" params={props} position={anchor} />;
    case "GRADIENT_DECAY_FIELD":
      return <SequenceVisualizer mode="GRADIENT_DECAY_FIELD" params={props} position={anchor} />;
    case "SEQ2SEQ_BOTTLENECK":
      return <SequenceVisualizer mode="SEQ2SEQ_BOTTLENECK" params={props} position={anchor} />;

    case "GPT_VS_BERT_SPLIT": {
      const path = props.activeSide === "BERT" ? "BERT" : "GPT";
      return <PretrainingPathsVisualizer path={path} params={props} position={anchor} />;
    }
    case "SCALING_HORIZON":
      return <ScalingHorizonVisualizer params={props} position={anchor} />;

    default:
      return null;
  }
}
