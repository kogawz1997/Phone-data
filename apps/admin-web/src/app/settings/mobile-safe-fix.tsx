"use client";

export default function SettingsMobileSafeFix() {
  return <style>{`
    @media (max-width: 980px) {
      .settingsSafe,
      .settingsSafe.collapsed {
        display: block;
        min-height: 100vh;
        padding: 10px;
      }

      .settingsSafe .safeSide {
        position: sticky;
        top: 8px;
        left: auto;
        right: auto;
        bottom: auto;
        z-index: 20;
        height: auto;
        width: auto;
        margin: 0 0 12px;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 22px;
        background: rgba(2, 8, 23, 0.82);
        backdrop-filter: blur(20px);
      }

      .settingsSafe.light .safeSide {
        background: rgba(255, 255, 255, 0.78);
      }

      .settingsSafe .safeBrand {
        min-height: 52px;
        justify-content: flex-start;
        padding: 0 8px;
        margin-bottom: 8px;
      }

      .settingsSafe .safeBrand b,
      .settingsSafe.collapsed .safeBrand b {
        display: block;
        max-width: 190px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .settingsSafe .safeBrand span,
      .settingsSafe .safeBrand img {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 15px;
      }

      .settingsSafe .safeSide nav {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 2px 0 6px;
        scrollbar-width: none;
      }

      .settingsSafe .safeSide nav::-webkit-scrollbar {
        display: none;
      }

      .settingsSafe .safeSide nav button,
      .settingsSafe.collapsed .safeSide nav button {
        min-width: max-content;
        min-height: 42px;
        justify-content: center;
        padding: 0 12px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.08);
      }

      .settingsSafe .safeSide nav button b,
      .settingsSafe.collapsed .safeSide nav button b {
        display: block;
        font-size: 13px;
      }

      .settingsSafe .safeSide nav button i {
        width: auto;
      }

      .settingsSafe .safeSideTools {
        display: flex;
        gap: 8px;
        margin-top: 6px;
        padding-top: 8px;
        border-top: 1px solid rgba(148, 163, 184, 0.12);
      }

      .settingsSafe .safeSideTools button,
      .settingsSafe .safeSideTools a,
      .settingsSafe.collapsed .safeSideTools button,
      .settingsSafe.collapsed .safeSideTools a {
        min-height: 38px;
        justify-content: center;
        padding: 0 12px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 999px;
      }

      .settingsSafe .safeSideTools b,
      .settingsSafe.collapsed .safeSideTools b {
        display: block;
        font-size: 12px;
      }

      .settingsSafe .safeMain {
        margin-left: 0;
        padding: 0 0 18px;
        width: 100%;
      }

      .settingsSafe .safeTop {
        align-items: stretch;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 12px;
      }

      .settingsSafe .safeTop h1 {
        font-size: 24px;
      }

      .settingsSafe .safeActions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
      }

      .settingsSafe .safeActions button {
        min-height: 46px;
        width: 100%;
      }

      .settingsSafe .safeHero {
        grid-template-columns: 1fr;
        gap: 14px;
        padding: 16px;
        border-radius: 22px;
      }

      .settingsSafe .safeAvatar {
        width: 104px;
        height: 104px;
      }

      .settingsSafe .safeHero h2 {
        font-size: 24px;
      }

      .settingsSafe .safeStats {
        grid-template-columns: 1fr 1fr;
      }

      .settingsSafe .safeWorkspace {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-top: 12px;
      }

      .settingsSafe .safePanel,
      .settingsSafe .safePreviewCard {
        border-radius: 20px;
        padding: 14px;
      }

      .settingsSafe .safeGrid {
        grid-template-columns: 1fr;
      }

      .settingsSafe .safePreview {
        position: static;
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .settingsSafe .safeSavebar {
        position: sticky;
        bottom: 8px;
        grid-template-columns: 1fr;
        padding: 10px;
        border-radius: 18px;
      }

      .settingsSafe .safeSavebar button {
        min-height: 46px;
      }
    }
  `}</style>;
}
