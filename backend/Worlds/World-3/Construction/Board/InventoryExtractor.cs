using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace IdleonHelperBackend.Worlds.World3.Construction.Board.BoardOptimizer;

public static class InventoryExtractor {
  public static Inventory ExtractFromJson(string jsonData) {
    var rawData = JsonConvert.DeserializeObject<JObject>(jsonData) ?? throw new Exception("JSON data is null.");

    var inv = new Inventory();

    if (rawData["GemItemsPurchased"] is JValue gemItemValue) {
      JArray gemItemsPurchased = JArray.Parse(gemItemValue.ToString());
      inv.FlaggyShopUpgrades = (int)gemItemsPurchased[184];
    }

    if (rawData["CogM"] is JValue cogValue) {
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
    }

    if (rawData["FlagP"] is JValue flagPValue) {
      JArray flagPArray = JArray.Parse(flagPValue.ToString());
      var newFlagPose = flagPArray.Where(v => v.Value<int>() >= 0).Select(v => v.Value<int>()).ToList();
      inv.FlagPose = newFlagPose;
    }

    if (rawData["FlagU"] is JValue flagUValue) {
      JArray flagUArray = JArray.Parse(flagUValue.ToString());

      Dictionary<int, Cog> slotsFlags = [];

      foreach (var (n, i) in flagUArray.Select((n, i) => (n, i))) {
        int value = n.Value<int>();
        if (value > 0 && inv.FlagPose.Contains(i)) {
          slotsFlags[i] = new Cog {
            Key = i,
            IsFlag = true,
            Fixed = true,
            Blocked = true,
          };
        } else if (value != -11) {
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

      foreach (var slot in slotsFlags) {
        var slotV = slot.Value;
        if (!slotV.Fixed) {
          if (inv.AvailableSlotKeys.Contains(slotV.Key)) {
            inv.AvailableSlotKeys.Remove(slotV.Key);
          }
          inv.AvailableSlotKeys.Add(slotV.Key);
        }
      }
    }

    return inv;
  }
}

