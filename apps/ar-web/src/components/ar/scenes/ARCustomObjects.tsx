import { ARObjectConfig } from "@/types/ar";

interface Props {
  objects?: ARObjectConfig[];
  active: boolean;
}

export function ARCustomObjects({ objects = [], active }: Props) {
  if (!active || objects.length === 0) return null;

  return (
    <>
      {objects.map((object) => (
        <a-entity
          key={object.id}
          position={`${object.position.x} ${object.position.y} ${object.position.z}`}
          rotation={`${object.rotation.x} ${object.rotation.y} ${object.rotation.z}`}
          scale={`${object.scale.x} ${object.scale.y} ${object.scale.z}`}
          visible={active}
        >
          <CustomObject object={object} />
        </a-entity>
      ))}
    </>
  );
}

function CustomObject({ object }: { object: ARObjectConfig }) {
  if (object.type === "text") {
    return (
      <a-text
        value={object.text || object.name}
        color={object.color}
        align="center"
        width={object.width}
        wrap-count="28"
        material={`transparent: true; opacity: ${object.opacity}`}
      />
    );
  }

  if (object.type === "model3d" && object.src) {
    return <a-gltf-model src={object.src} />;
  }

  if (object.type === "video" && object.src) {
    return (
      <a-video
        src={object.src}
        width={object.width}
        height={object.height}
        material={`transparent: true; opacity: ${object.opacity}`}
      />
    );
  }

  if ((object.type === "image" || object.type === "gif") && object.src) {
    return (
      <a-image
        src={object.src}
        width={object.width}
        height={object.height}
        material={`transparent: true; opacity: ${object.opacity}`}
      />
    );
  }

  return (
    <a-plane
      width={object.width}
      height={object.height}
      color={object.color}
      material={`transparent: true; opacity: ${object.opacity}`}
    />
  );
}
