using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using IdleonHelperBackend.Utils;

namespace IdleonHelperBackend.Worlds.World2.WeeklyBattle;

internal record WeeklyBattleRunResult(bool Success, string Message, IReadOnlyList<int> Numbers);

internal static class WeeklyBattleRunner {
  private static readonly Point[] SelectSlots = {
    new Point(613, 337), // 1
    new Point(613, 398), // 2
    new Point(613, 459)  // 3
  };

  public static async Task<WeeklyBattleRunResult> RunWeeklyBattleFlow(
    IEnumerable<int> numbers,
    CancellationToken cancellationToken
  ) {
    var normalized = numbers.Where(n => n > 0).ToArray();

    Console.WriteLine("[WeeklyBattle] Checking availability (wait button)");
    bool waitVisible = await UIInteraction.IsVisible("weekly-battle/wait.png", cancellationToken);
    Console.WriteLine($"[WeeklyBattle] wait visible: {waitVisible}");
    if (waitVisible) {
      return new WeeklyBattleRunResult(false, "Weekly battle unavailable (wait detected).", normalized);
    }

    Console.WriteLine("[WeeklyBattle] Checking for restart button");
    bool restartVisible = await UIInteraction.IsVisible("weekly-battle/restart.png", cancellationToken);
    Console.WriteLine($"[WeeklyBattle] restart visible: {restartVisible}");
    if (restartVisible) {
      Console.WriteLine("[WeeklyBattle] Clicking restart");
      await UIInteraction.FindAndClick("weekly-battle/restart.png", cancellationToken);
    }

    bool selectVisible = await UIInteraction.IsVisible("weekly-battle/select.png", cancellationToken);
    Console.WriteLine($"[WeeklyBattle] select visible: {selectVisible}");
    if (!selectVisible) {
      return new WeeklyBattleRunResult(false, "Select button not found.", normalized);
    }

    foreach (var number in normalized) {
      int index = number - 1; // numbers are 1-based
      if (index < 0 || index >= SelectSlots.Length) {
        Console.WriteLine($"[WeeklyBattle] number {number} out of range for available selects ({SelectSlots.Length})");
        continue;
      }

      var target = SelectSlots[index];
      Console.WriteLine($"[WeeklyBattle] Clicking select for {number} at ({target.X},{target.Y})");
      await UIInteraction.Click(target, cancellationToken);
    }

    return new WeeklyBattleRunResult(true, "Weekly battle select clicks dispatched.", normalized);
  }

}

