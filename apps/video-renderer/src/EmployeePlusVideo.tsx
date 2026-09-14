import {
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { scenes, sceneFrames, type VideoScene } from "./script";

export type EmployeePlusVideoProps = {
  voiceFile?: string;
};

const colors = {
  bg: "#071016",
  panel: "#10262d",
  panel2: "#0c1c23",
  line: "rgba(165, 243, 223, .22)",
  muted: "#8baeb0",
  soft: "#bdd5d6",
  text: "#effafa",
  accent: "#a5f3df",
  blue: "#9dc9ff",
  warning: "#ffcf85",
  success: "#a5f3c9",
};

const font =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

function fade(frame: number, durationInFrames: number) {
  return interpolate(
    frame,
    [0, 5, durationInFrames - 5, durationInFrames],
    [1, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

function Frame({
  children,
  label = "SIMULATED ALEXA+ EXPERIENCE",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      style={{
        background: colors.bg,
        color: colors.text,
        fontFamily: font,
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(circle at 83% -10%, #17404a 0, transparent 34rem)",
          inset: 0,
          opacity: 0.8,
          position: "absolute",
        }}
      />
      <div
        style={{
          alignItems: "center",
          borderBottom: `1px solid ${colors.line}`,
          display: "flex",
          justifyContent: "space-between",
          left: 72,
          padding: "27px 0 23px",
          position: "absolute",
          right: 72,
          top: 0,
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
          <div
            style={{
              alignItems: "center",
              background: "rgba(165,243,223,.12)",
              border: `1px solid ${colors.accent}`,
              borderRadius: 12,
              color: colors.accent,
              display: "flex",
              fontSize: 31,
              height: 46,
              justifyContent: "center",
              width: 46,
            }}
          >
            +
          </div>
          <div>
            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: -1 }}>
              Employee<span style={{ color: colors.accent }}>+</span>
            </div>
            <div
              style={{
                color: colors.muted,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 3,
                marginTop: 3,
              }}
            >
              HOME CARE CONCIERGE
            </div>
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            border: `1px solid ${colors.line}`,
            borderRadius: 999,
            color: colors.soft,
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            gap: 10,
            letterSpacing: 1,
            padding: "12px 16px",
          }}
        >
          <span
            style={{
              background: colors.success,
              borderRadius: "50%",
              boxShadow: "0 0 0 5px rgba(165,243,201,.1)",
              height: 7,
              width: 7,
            }}
          />
          {label}
        </div>
      </div>
      <div style={{ height: "100%", position: "relative", zIndex: 1 }}>
        {children}
      </div>
      <div
        style={{
          bottom: 25,
          color: colors.muted,
          fontSize: 12,
          left: 72,
          letterSpacing: 0.4,
          position: "absolute",
        }}
      >
        Synthetic service data · No real services or payments
      </div>
      <div
        style={{
          bottom: 25,
          color: colors.accent,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 1,
          position: "absolute",
          right: 72,
        }}
      >
        EMPLOYEE+ / 2026
      </div>
    </div>
  );
}

function Eyebrow({
  children,
  color = colors.accent,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        color,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 3,
        marginBottom: 14,
      }}
    >
      {children}{" "}
      <span
        style={{
          display: "inline-block",
          height: 1,
          marginLeft: 7,
          verticalAlign: "middle",
          width: 30,
          background: color,
        }}
      />
    </div>
  );
}

function Subtitle({ scene }: { scene: VideoScene }) {
  return (
    <div
      style={{
        bottom: 83,
        color: colors.text,
        fontSize: 28,
        fontWeight: 650,
        left: 72,
        letterSpacing: -0.6,
        position: "absolute",
        right: 72,
        textAlign: "center",
      }}
    >
      {scene.subtitle}
    </div>
  );
}

function Card({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: `linear-gradient(145deg, ${colors.panel}, ${colors.panel2})`,
        border: `1px solid ${colors.line}`,
        borderRadius: 18,
        boxShadow: "0 24px 70px rgba(0,0,0,.22)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BriefVisual() {
  return (
    <Card style={{ padding: 28, width: 760 }}>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 30,
        }}
      >
        <div>
          <Eyebrow>THIS WEEK</Eyebrow>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -1 }}>
            Home Care Board
          </div>
        </div>
        <div style={{ color: colors.accent, fontSize: 37, fontWeight: 800 }}>
          1{" "}
          <span style={{ color: colors.muted, fontSize: 13, fontWeight: 500 }}>
            item to review
          </span>
        </div>
      </div>
      <div
        style={{
          alignItems: "center",
          background: "rgba(255,207,133,.1)",
          border: "1px solid rgba(255,207,133,.44)",
          borderRadius: 15,
          display: "flex",
          gap: 18,
          padding: 20,
        }}
      >
        <div
          style={{
            alignItems: "center",
            border: `1px solid ${colors.warning}`,
            borderRadius: "50%",
            color: colors.warning,
            display: "flex",
            fontSize: 24,
            fontWeight: 900,
            height: 44,
            justifyContent: "center",
            width: 44,
          }}
        >
          !
        </div>
        <div>
          <Eyebrow color={colors.warning}>NEEDS ATTENTION</Eyebrow>
          <div style={{ fontSize: 22, fontWeight: 750 }}>
            Your water heater needs attention this week.
          </div>
          <div style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>
            Main water heater · Utility room
          </div>
        </div>
      </div>
    </Card>
  );
}

function PainVisual() {
  const items = [
    ["Water heater", "Needs attention", colors.warning],
    ["HVAC filter", "Due in 6 days", colors.blue],
    ["Kitchen faucet", "Monitoring", colors.muted],
  ] as const;
  return (
    <Card style={{ padding: 24, width: 1240 }}>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <Eyebrow>HOME CARE BACKLOG</Eyebrow>
          <div style={{ fontSize: 25, fontWeight: 800 }}>
            Small problems add up.
          </div>
        </div>
        <div style={{ color: colors.warning, fontSize: 14, fontWeight: 800 }}>
          3 open threads
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {items.map(([name, state, color], index) => (
          <div
            key={name}
            style={{
              background:
                index === 0 ? "rgba(255,207,133,.1)" : "rgba(17,39,46,.78)",
              border: `1px solid ${index === 0 ? "rgba(255,207,133,.44)" : colors.line}`,
              borderRadius: 12,
              flex: 1,
              padding: 16,
            }}
          >
            <div style={{ alignItems: "center", display: "flex", gap: 10 }}>
              <span
                style={{
                  background: color,
                  borderRadius: "50%",
                  boxShadow:
                    index === 0 ? "0 0 0 5px rgba(255,207,133,.1)" : "none",
                  height: 8,
                  width: 8,
                }}
              />
              <span
                style={{ color: colors.text, fontSize: 16, fontWeight: 800 }}
              >
                {name}
              </span>
            </div>
            <div
              style={{ color, fontSize: 13, fontWeight: 800, marginTop: 12 }}
            >
              {state}
            </div>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>
              {index === 0
                ? "Utility room"
                : index === 1
                  ? "Replace before peak season"
                  : "Last note: 2 weeks ago"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Quote({
  name,
  price,
  rating,
  selected,
  color,
}: {
  name: string;
  price: string;
  rating: string;
  selected?: boolean;
  color: string;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        background: selected ? "rgba(165,243,223,.11)" : "rgba(17,39,46,.78)",
        border: `1px solid ${selected ? colors.accent : colors.line}`,
        borderRadius: 14,
        display: "flex",
        gap: 16,
        marginTop: 10,
        padding: 17,
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: `${color}22`,
          borderRadius: 11,
          color,
          display: "flex",
          fontSize: 20,
          fontWeight: 900,
          height: 45,
          justifyContent: "center",
          width: 45,
        }}
      >
        {name[0]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{name}</div>
        <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>
          Water heater inspection and flush
        </div>
        <div
          style={{
            color: colors.soft,
            display: "flex",
            fontSize: 12,
            gap: 17,
            marginTop: 10,
          }}
        >
          <b style={{ color: colors.text, fontSize: 15 }}>{price}</b>
          <span>12 mo warranty</span>
          <span>★ {rating}</span>
        </div>
      </div>
      {selected ? (
        <div
          style={{
            background: colors.accent,
            borderRadius: 9,
            color: "#06201e",
            fontSize: 12,
            fontWeight: 900,
            padding: "10px 12px",
          }}
        >
          SELECTED
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${colors.line}`,
            borderRadius: 9,
            color: colors.accent,
            fontSize: 12,
            fontWeight: 800,
            padding: "10px 12px",
          }}
        >
          SELECT
        </div>
      )}
    </div>
  );
}

function CompareVisual({ frame }: { frame: number }) {
  const selected = frame > 40;
  return (
    <div
      style={{
        display: "flex",
        gap: 22,
        left: 72,
        position: "absolute",
        right: 72,
        top: 360,
      }}
    >
      <Card style={{ flex: 1, padding: 28 }}>
        <Eyebrow>VOICE LAYER</Eyebrow>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 28 }}>
          “Compare repair options.”
        </div>
        <div style={{ color: colors.muted, fontSize: 15, lineHeight: 1.5 }}>
          Employee+ compares the details that matter before you commit.
        </div>
        <div
          style={{
            alignItems: "center",
            color: colors.success,
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            gap: 9,
            marginTop: 42,
          }}
        >
          <span
            style={{
              background: colors.success,
              borderRadius: "50%",
              height: 7,
              width: 7,
            }}
          />{" "}
          MCP LIVE
        </div>
      </Card>
      <Card style={{ flex: 2, padding: 28 }}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Eyebrow>SMART MATCHES</Eyebrow>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Service options</div>
          </div>
          <div style={{ color: colors.muted, fontSize: 13 }}>2 compared</div>
        </div>
        <Quote
          color={colors.accent}
          name="Northstar Home Care"
          price="$189"
          rating="4.9"
          selected={selected}
        />
        <Quote
          color={colors.blue}
          name="Cedar & Coil"
          price="$215"
          rating="4.7"
        />
      </Card>
    </div>
  );
}

function ConfirmationVisual({
  changed = false,
  top = 360,
}: {
  changed?: boolean;
  top?: number;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 25,
        left: 150,
        position: "absolute",
        right: 150,
        top,
      }}
    >
      <div
        style={{
          alignItems: "center",
          border: `2px solid ${colors.accent}`,
          borderRadius: "50%",
          color: colors.accent,
          display: "flex",
          fontSize: 46,
          height: 110,
          justifyContent: "center",
          width: 110,
        }}
      >
        {changed ? "↻" : "?"}
      </div>
      <Card style={{ flex: 1, padding: 33 }}>
        <Eyebrow color={changed ? colors.accent : colors.warning}>
          {changed ? "CHANGE CONFIRMATION" : "EXPLICIT CONFIRMATION"}
        </Eyebrow>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
          {changed ? "Move Northstar Home Care" : "Book Northstar Home Care"}
        </div>
        <div style={{ color: colors.soft, fontSize: 20, marginTop: 16 }}>
          {changed
            ? "Thursday, Sep 17 · 1:00 PM"
            : "$189 · Wednesday, Sep 16 · 9:00 AM"}
        </div>
        <div style={{ color: colors.muted, fontSize: 14, marginTop: 13 }}>
          {changed
            ? "Provider and service preserved · Nothing else changed"
            : "Water heater inspection and flush · Utility room access"}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 27 }}>
          <div
            style={{
              background: colors.accent,
              borderRadius: 9,
              color: "#06201e",
              fontSize: 14,
              fontWeight: 900,
              padding: "14px 18px",
            }}
          >
            {changed ? "CONFIRM CHANGE" : "CONFIRM BOOKING"}
          </div>
          <div
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 9,
              color: colors.muted,
              fontSize: 14,
              padding: "14px 18px",
            }}
          >
            Not yet
          </div>
        </div>
      </Card>
    </div>
  );
}

function BoardVisual() {
  return (
    <div
      style={{
        alignItems: "stretch",
        display: "flex",
        gap: 20,
        left: 160,
        position: "absolute",
        right: 160,
        top: 360,
      }}
    >
      <Card style={{ flex: 1, padding: 28 }}>
        <Eyebrow>UPCOMING VISIT</Eyebrow>
        <div style={{ fontSize: 25, fontWeight: 800 }}>Northstar Home Care</div>
        <div
          style={{
            borderBottom: `1px solid ${colors.line}`,
            color: colors.soft,
            fontSize: 17,
            marginTop: 20,
            paddingBottom: 20,
          }}
        >
          Thursday, Sep 17
          <br />
          <span style={{ color: colors.muted, fontSize: 14 }}>
            1:00 PM · Utility room access
          </span>
        </div>
        <div
          style={{
            alignItems: "center",
            color: colors.success,
            display: "flex",
            fontSize: 13,
            fontWeight: 800,
            gap: 9,
            marginTop: 22,
          }}
        >
          <span
            style={{
              background: colors.success,
              borderRadius: "50%",
              height: 8,
              width: 8,
            }}
          />{" "}
          RESCHEDULED
        </div>
      </Card>
      <Card style={{ flex: 1.2, padding: 28 }}>
        <Eyebrow>TRUST BY DESIGN</Eyebrow>
        <div style={{ fontSize: 26, fontWeight: 800 }}>
          Always clear before action.
        </div>
        <div
          style={{
            color: colors.muted,
            fontSize: 16,
            lineHeight: 1.5,
            marginTop: 16,
          }}
        >
          Final price, provider, time, and explicit confirmation before any
          booking or change.
        </div>
        <div
          style={{
            color: colors.accent,
            fontSize: 42,
            fontWeight: 900,
            marginTop: 25,
          }}
        >
          ✓
        </div>
      </Card>
    </div>
  );
}

function ArchitectureVisual() {
  const nodes = ["Alexa+", "Employee+ MCP", "DynamoDB", "AWS events"];
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 18,
        left: 150,
        position: "absolute",
        right: 150,
        top: 390,
      }}
    >
      {nodes.map((node, index) => (
        <div
          key={node}
          style={{ alignItems: "center", display: "flex", flex: 1, gap: 18 }}
        >
          {
            <Card
              style={{
                alignItems: "center",
                display: "flex",
                flex: 1,
                justifyContent: "center",
                minHeight: 105,
                padding: 20,
              }}
            >
              <div>
                <div
                  style={{
                    color: index === 1 ? colors.accent : colors.text,
                    fontSize: 19,
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                >
                  {node}
                </div>
                <div
                  style={{
                    color: colors.muted,
                    fontSize: 11,
                    marginTop: 9,
                    textAlign: "center",
                  }}
                >
                  {index === 0
                    ? "voice + visual"
                    : index === 1
                      ? "tools + resources"
                      : index === 2
                        ? "durable state"
                        : "safe workflows"}
                </div>
              </div>
            </Card>
          }
          {index < nodes.length - 1 && (
            <div style={{ color: colors.accent, fontSize: 30 }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}

function Scene({ scene }: { scene: VideoScene }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = fade(frame, durationInFrames);
  return (
    <div style={{ height: "100%", opacity, width: "100%" }}>
      <Frame>
        <div style={{ left: 72, position: "absolute", top: 150 }}>
          <Eyebrow>{scene.eyebrow}</Eyebrow>
          <div
            style={{
              fontSize: 50,
              fontWeight: 850,
              letterSpacing: -2.2,
              maxWidth: 1000,
            }}
          >
            {scene.id === "hook" ? (
              <>
                The house never stops{" "}
                <span style={{ color: colors.accent }}>asking.</span>
              </>
            ) : scene.id === "brief" ? (
              <>
                A calmer way to care
                <br />
                <span style={{ color: colors.accent }}>for what matters.</span>
              </>
            ) : scene.id === "close" ? (
              <>
                The next right action,
                <br />
                <span style={{ color: colors.accent }}>made effortless.</span>
              </>
            ) : (
              scene.subtitle
            )}
          </div>
        </div>
        {scene.id === "hook" && (
          <div style={{ left: 72, position: "absolute", right: 72, top: 455 }}>
            <PainVisual />
          </div>
        )}
        {scene.id === "brief" && (
          <div style={{ left: 72, position: "absolute", right: 72, top: 440 }}>
            <BriefVisual />
          </div>
        )}
        {scene.id === "compare" && <CompareVisual frame={frame} />}
        {scene.id === "prepare" && <ConfirmationVisual />}
        {scene.id === "book" && <ConfirmationVisual />}
        {scene.id === "change" && <ConfirmationVisual changed />}
        {scene.id === "board" && <BoardVisual />}
        {scene.id === "close" && <ArchitectureVisual />}
        <Subtitle scene={scene} />
      </Frame>
    </div>
  );
}

export function EmployeePlusVideo({ voiceFile }: EmployeePlusVideoProps) {
  return (
    <>
      {voiceFile && <Audio src={staticFile(voiceFile)} volume={0.95} />}
      {scenes.map((scene) => (
        <Sequence key={scene.id} {...sceneFrames(scene)}>
          <Scene scene={scene} />
        </Sequence>
      ))}
    </>
  );
}
