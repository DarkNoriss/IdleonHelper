using System.Drawing;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace IdleonBotBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public static class BoardOptimizer {
  private static readonly int SOLVER_TIME = 10000;
  public static readonly Dictionary<string, double> SOLVER_WEIGHTS = new() {
    { "buildRate", 1.0 },
    { "expBonus", 100.0 },
    { "flaggy", 250.0 }
  };

  // Store inventories per session/source
  private static readonly Dictionary<string, Inventory> inventories = new();

  public const int SPARE_COLUMNS = 5;
  public const int SPARE_ROWS = 3;
  public const int COGS_STEP = 47;
  public static readonly Point SPARE_FIRST_COORDS = new(25, 130);
  public static readonly Point BOARD_FIRST_COORDS = new(210, 130);
  public static readonly Point COLLECT_ULTIMATE_COGS = new(291, 420);

  public static async Task<Score> LoadJsonData(string data, string source, Func<string, Task>? logCallback, CancellationToken ct) {
      var rawData = JsonConvert.DeserializeObject<JObject>(data) ?? throw new Exception("JSON data is null.");

      var inv = new Inventory();

      async Task Log(string message) {
        if (logCallback != null) {
          await logCallback(message);
        }
      }

      if(rawData["GemItemsPurchased"] is JValue gemItemValue) {
        JArray gemItemsPurchased = JArray.Parse(gemItemValue.ToString());

        inv.FlaggyShopUpgrades = (int)gemItemsPurchased[184];
        await Log($"Flaggy shop upgrades loaded successfully ({inv.FlaggyShopUpgrades}).");
      }

      if(rawData["CogM"] is JValue cogValue) {
        JObject cogM = JObject.Parse(cogValue.ToString());

        Dictionary<int, Cog> cogDict = cogM.Properties()
          .ToDictionary(
              prop => int.Parse(prop.Name),
              prop => {
                int keyNum = int.Parse(prop.Name);
                JObject c = (JObject)prop.Value;
                return new Cog {
                  Key = keyNum,
                  InitialKey = keyNum,
                  BuildRate = c.Value<double>("a"),
                  IsPlayer = c.Value<double>("b") > 0,
                  ExpGain = c.Value<double>("b"),
                  Flaggy = c.Value<double>("c"),
                  ExpBonus = c.Value<double>("d"),
                  BuildRadiusBoost = c.Value<double>("e"),
                  ExpRadiusBoost = c.Value<double>("f"),
                  FlaggyRadiusBoost = c.Value<double>("g"),
                  BoostRadius = c.Value<string>("h") ?? "",
                  FlagBoost = c.Value<double>("j"),
                  Nothing = c.Value<double>("k"),
                  Fixed = c.Value<string>("h") == "everything",
                  Blocked = false
                };
              }
          );

        inv.Cogs = cogDict;
        await Log($"Cogs loaded successfully ({inv.Cogs.Count}).");
      }

      if(rawData["FlagP"] is JValue flagPValue) {
        JArray flagPArray = JArray.Parse(flagPValue.ToString());
        var newFlagPose = flagPArray.Where(v => v.Value<int>() >= 0).Select(v => v.Value<int>()).ToList();

        inv.FlagPose = newFlagPose;
        await Log($"Flag pose loaded successfully ({inv.FlagPose.Count}).");
      }

      if(rawData["FlagU"] is JValue flagUValue) {
        JArray flagUArray = JArray.Parse(flagUValue.ToString());

        Dictionary<int, Cog> slotsFlags = [];

        foreach(var (n, i) in flagUArray.Select((n, i) => (n, i))) {
          int value = n.Value<int>();
          if(value > 0 && inv.FlagPose.Contains(i)) {
            slotsFlags[i] = new Cog {
              Key = i,
              IsFlag = true,
              Fixed = true,
              Blocked = true,
            };
          } else if(value != -11) {
            slotsFlags[i] = new Cog {
              Key = i,
              Fixed = true,
              Blocked = true,
            };
          } else {
            slotsFlags[i] = new Cog {
              Key = i,
            };
          }
        }

        inv.Slots = slotsFlags;

        foreach(var slot in slotsFlags) {
          var slotV = slot.Value;
          if(!slotV.Fixed) {
            if(inv.AvailableSlotKeys.Contains(slotV.Key)) {
              inv.AvailableSlotKeys.Remove(slotV.Key);
            }
            inv.AvailableSlotKeys.Add(slotV.Key);
          }
        }
        await Log($"Flag upgrades loaded successfully ({inv.Slots.Count}).");
      }

      // Store inventory for this session
      inventories[source] = inv;

      await Log("JSON data loaded successfully.");

      // Return the score
      return await Task.FromResult(inv.Score);
    }

  public static Inventory? GetInventory(string source) {
    return inventories.TryGetValue(source, out var inv) ? inv : null;
  }
}
