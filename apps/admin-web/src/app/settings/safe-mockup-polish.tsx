export default function SafeMockupPolish() {
  return <style>{`
    body:has(.settingsSafe) .ux-bottom-nav,
    body:has(.settingsSafe) .ux-sheet,
    body:has(.settingsSafe) .ux-sheet-backdrop,
    body:has(.settingsSafe) .ux-smart-search {
      display: none;
    }

    .settingsSafe {
      grid-template-columns: 222px minmax(0, 1fr);
      background:
        radial-gradient(circle at 20% 0%, rgba(34, 211, 238, 0.14), transparent 28%),
        radial-gradient(circle at 86% 0%, rgba(139, 92, 246, 0.16), transparent 31%),
        linear-gradient(135deg, #020817, #07111f 48%, #0b1020) !important;
    }

    .settingsSafe.collapsed {
      grid-template-columns: 92px minmax(0, 1fr);
    }

    .settingsSafe .safeSide {
      margin: 10px 0 10px 10px;
      height: calc(100vh - 20px);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(10, 21, 37, 0.92), rgba(3, 10, 22, 0.96));
      box-shadow: 0 26px 80px rgba(0, 0, 0, 0.35);
    }

    .settingsSafe .safeBrand {
      min-height: 64px;
      justify-content: flex-start;
      background: transparent;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      border-radius: 18px 18px 8px 8px;
    }

    .settingsSafe .safeBrand span,
    .settingsSafe .safeBrand img {
      width: 54px;
      height: 54px;
      min-width: 54px;
      border-radius: 19px;
      box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.25), 0 18px 38px rgba(34, 211, 238, 0.16);
    }

    .settingsSafe .safeSide nav {
      gap: 9px;
      padding-top: 6px;
    }

    .settingsSafe .safeSide nav button,
    .settingsSafe .safeSideTools button,
    .settingsSafe .safeSideTools a {
      min-height: 46px;
      border: 1px solid transparent;
      border-radius: 15px;
      font-weight: 760;
    }

    .settingsSafe .safeSide nav button.active {
      color: #fff;
      border-color: rgba(34, 211, 238, 0.26);
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.74), rgba(139, 92, 246, 0.88));
      box-shadow: 0 14px 32px rgba(59, 130, 246, 0.24);
    }

    .settingsSafe .safeMain {
      padding: 14px 18px 28px;
    }

    .settingsSafe .safeTop {
      min-height: 62px;
      margin-bottom: 16px;
      padding: 0 4px 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }

    .settingsSafe .safeTop h1 {
      font-size: 26px;
      line-height: 1;
    }

    .settingsSafe .safeActions button {
      min-width: 112px;
    }

    .settingsSafe .safeHero {
      position: relative;
      overflow: hidden;
      padding: 22px;
      border-radius: 26px;
      background:
        linear-gradient(135deg, rgba(11, 23, 42, 0.88), rgba(13, 25, 46, 0.92)),
        radial-gradient(circle at 86% 20%, rgba(124, 92, 255, 0.18), transparent 34%) !important;
    }

    .settingsSafe .safeHero::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(148, 163, 184, 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.045) 1px, transparent 1px);
      background-size: 34px 34px;
      mask-image: linear-gradient(180deg, rgba(0,0,0,.72), transparent 74%);
    }

    .settingsSafe .safeHero > * {
      position: relative;
      z-index: 1;
    }

    .settingsSafe .safeAvatar {
      width: 128px;
      height: 128px;
      border: 2px solid rgba(59, 130, 246, 0.95);
      box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.16), 0 22px 54px rgba(37, 99, 235, 0.22);
    }

    .settingsSafe .safeStats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .settingsSafe .safeStat {
      min-height: 82px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(15, 29, 52, 0.88), rgba(9, 18, 34, 0.9));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    }

    .settingsSafe .safeWorkspace {
      grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
      align-items: start;
    }

    .settingsSafe .safePanel,
    .settingsSafe .safePreviewCard {
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(13, 25, 46, 0.92), rgba(8, 16, 31, 0.94));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 18px 54px rgba(0,0,0,.18);
    }

    .settingsSafe .safePanel h3,
    .settingsSafe .safePreviewCard h3 {
      font-size: 19px;
    }

    .settingsSafe .safeField input,
    .settingsSafe .safeField textarea {
      background: rgba(3, 9, 20, 0.55);
      border-color: rgba(148, 163, 184, 0.16);
      min-height: 42px;
    }

    .settingsSafe .safePreview {
      top: 14px;
    }

    .settingsSafe .safeMiniStore {
      background: rgba(2, 8, 23, 0.34);
    }

    .settingsSafe .safeCheck {
      background: rgba(2, 8, 23, 0.24);
    }

    .settingsSafe .safeSavebar {
      bottom: 16px;
      grid-template-columns: 0.9fr 1.25fr 1fr;
      border-radius: 20px;
      background: rgba(4, 12, 26, 0.86);
      box-shadow: 0 20px 54px rgba(0,0,0,.32);
    }

    .settingsSafe .safeSavebar button {
      min-height: 48px;
      font-weight: 850;
    }

    @media (max-width: 1100px) {
      .settingsSafe .safeWorkspace {
        grid-template-columns: 1fr;
      }
      .settingsSafe .safePreview {
        position: static;
        grid-template-columns: 1fr 1fr;
        display: grid;
      }
    }

    @media (max-width: 760px) {
      .settingsSafe,
      .settingsSafe.collapsed {
        grid-template-columns: 76px minmax(0, 1fr);
      }
      .settingsSafe .safeSide {
        margin: 8px 0 8px 8px;
        width: 68px;
      }
      .settingsSafe .safeMain {
        margin-left: 0;
        padding: 10px 10px 24px;
      }
      .settingsSafe .safeHero {
        padding: 16px;
      }
      .settingsSafe .safeStats,
      .settingsSafe .safePreview {
        grid-template-columns: 1fr;
      }
      .settingsSafe .safeSavebar {
        position: static;
        grid-template-columns: 1fr;
      }
    }
  `}</style>;
}
