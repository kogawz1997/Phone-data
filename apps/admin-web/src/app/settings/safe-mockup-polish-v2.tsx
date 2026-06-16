export default function SafeMockupPolishV2() {
  return <style>{`
    .settingsSafe {
      isolation: isolate;
    }

    .settingsSafe::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background:
        linear-gradient(90deg, rgba(148, 163, 184, 0.035) 1px, transparent 1px),
        linear-gradient(rgba(148, 163, 184, 0.035) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: radial-gradient(circle at 48% 12%, rgba(0,0,0,.8), transparent 66%);
    }

    .settingsSafe .safeSide,
    .settingsSafe .safeMain {
      position: relative;
      z-index: 1;
    }

    .settingsSafe .safeMain {
      max-width: 1500px;
      width: 100%;
      margin: 0 auto;
    }

    .settingsSafe .safeTop {
      border-radius: 22px;
      padding: 14px 16px;
      border: 1px solid rgba(148, 163, 184, 0.12);
      background: rgba(2, 8, 23, 0.28);
      backdrop-filter: blur(18px);
    }

    .settingsSafe.light .safeTop {
      background: rgba(255, 255, 255, 0.52);
    }

    .settingsSafe .safeTop h1::after {
      content: " / Profile Console";
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0;
      margin-left: 8px;
    }

    .settingsSafe .safeActions button {
      transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
    }

    .settingsSafe .safeActions button:hover,
    .settingsSafe .safeSavebar button:hover,
    .settingsSafe .safeLogoBox button:hover,
    .settingsSafe .safeSecondary:hover {
      transform: translateY(-1px);
      border-color: rgba(34, 211, 238, 0.34);
      box-shadow: 0 12px 28px rgba(14, 165, 233, 0.12);
    }

    .settingsSafe .safeHero {
      min-height: 178px;
      grid-template-columns: 140px minmax(230px, 1fr) minmax(360px, 1.4fr);
    }

    .settingsSafe .safeHero h2 {
      letter-spacing: -0.045em;
    }

    .settingsSafe .safeStats {
      align-self: stretch;
    }

    .settingsSafe .safeStat {
      display: grid;
      align-content: center;
      gap: 7px;
      transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
    }

    .settingsSafe .safeStat:hover {
      transform: translateY(-2px);
      border-color: rgba(34, 211, 238, 0.28);
      box-shadow: 0 16px 42px rgba(2, 8, 23, 0.24);
    }

    .settingsSafe .safeStat b {
      font-size: clamp(22px, 3vw, 30px);
      letter-spacing: -0.05em;
    }

    .settingsSafe .safeWorkspace {
      margin-top: 18px;
      gap: 18px;
    }

    .settingsSafe .safeActivePanel {
      min-width: 0;
    }

    .settingsSafe .safePanel {
      min-height: 470px;
      align-content: start;
    }

    .settingsSafe .safePanel h3 {
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      padding-bottom: 13px;
      margin-bottom: 2px;
    }

    .settingsSafe .safePanel h3 i,
    .settingsSafe .safePreviewCard h3::before {
      width: 34px;
      height: 34px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(139, 92, 246, 0.18));
      color: #67e8f9;
    }

    .settingsSafe .safePreviewCard h3::before {
      content: "◎";
      font-size: 15px;
    }

    .settingsSafe .safeField span,
    .settingsSafe .safeToggle span {
      font-weight: 750;
    }

    .settingsSafe .safeField input,
    .settingsSafe .safeField textarea {
      transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
    }

    .settingsSafe .safeField input:focus,
    .settingsSafe .safeField textarea:focus {
      border-color: rgba(34, 211, 238, 0.56);
      box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.10);
    }

    .settingsSafe .safePreview {
      gap: 18px;
    }

    .settingsSafe .safePreviewCard {
      overflow: hidden;
      position: relative;
    }

    .settingsSafe .safePreviewCard::after {
      content: "";
      position: absolute;
      right: -60px;
      top: -70px;
      width: 160px;
      height: 160px;
      border-radius: 999px;
      background: rgba(34, 211, 238, 0.08);
      filter: blur(4px);
      pointer-events: none;
    }

    .settingsSafe .safeMiniStore {
      position: relative;
      overflow: hidden;
      min-height: 86px;
    }

    .settingsSafe .safeMiniStore::after {
      content: "Preview";
      position: absolute;
      right: 12px;
      bottom: 10px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .settingsSafe .safePreviewCard dl {
      border-top: 1px solid rgba(148, 163, 184, 0.12);
      padding-top: 12px;
    }

    .settingsSafe .safeCheck {
      transition: transform .16s ease, border-color .16s ease, background .16s ease;
    }

    .settingsSafe .safeCheck:hover {
      transform: translateX(2px);
      border-color: rgba(34, 211, 238, 0.22);
      background: rgba(34, 211, 238, 0.07);
    }

    .settingsSafe .safeCheck b {
      font-size: 14px;
    }

    .settingsSafe .safeSavebar {
      max-width: 920px;
      margin: 0 auto;
      z-index: 4;
    }

    .settingsSafe .safeSide nav button {
      position: relative;
      overflow: hidden;
    }

    .settingsSafe .safeSide nav button.active::after {
      content: "";
      position: absolute;
      right: 9px;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #fff;
      box-shadow: 0 0 18px rgba(255, 255, 255, 0.8);
    }

    .settingsSafe .safeSideTools {
      border-top: 1px solid rgba(148, 163, 184, 0.12);
      padding-top: 10px;
    }

    .settingsSafe .safeAlert {
      backdrop-filter: blur(16px);
      background: rgba(2, 8, 23, 0.44);
    }

    .settingsSafe.light .safeAlert {
      background: rgba(255, 255, 255, 0.68);
    }

    @media (max-width: 1200px) {
      .settingsSafe .safeHero {
        grid-template-columns: 128px minmax(180px, 1fr);
      }
      .settingsSafe .safeStats {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 760px) {
      .settingsSafe .safeTop h1::after {
        display: none;
      }
      .settingsSafe .safeTop,
      .settingsSafe .safeHero,
      .settingsSafe .safePanel,
      .settingsSafe .safePreviewCard {
        border-radius: 18px;
      }
      .settingsSafe .safeHero {
        grid-template-columns: 1fr;
      }
      .settingsSafe .safeAvatar {
        width: 112px;
        height: 112px;
      }
      .settingsSafe .safePanel {
        min-height: auto;
      }
      .settingsSafe .safeSavebar {
        max-width: none;
      }
    }
  `}</style>;
}
