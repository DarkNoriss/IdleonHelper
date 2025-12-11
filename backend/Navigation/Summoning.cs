using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Navigation;

public static class NavigationSummoning {
    public static async Task<bool> OpenSummoningBoard(CancellationToken ct) {
        if (await UiInteraction.IsVisible("summoning/endless.png", ct)) {
            return true;
        }

        var clicked = await UiInteraction.NavigateTo("summoning/board.png", ct);
        if (!clicked) {
            return false;
        }

        var isOpen = await UiInteraction.IsVisible("summoning/endless.png", ct);
        if (isOpen) {
            return true;
        }

        clicked = await UiInteraction.NavigateTo("summoning/board.png", ct);
        if (!clicked) {
            return false;
        }

        return await UiInteraction.IsVisible("summoning/endless.png", ct);
    }
}

