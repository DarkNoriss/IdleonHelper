using System.Globalization;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace IdleonHelperBackend.Worlds.World_3.Construction.Board;

public static class InventoryExtractor {
  public static Inventory ExtractFromJson(string jsonData) {
    var rawData = JsonConvert.DeserializeObject<JObject>(jsonData) ?? throw new Exception("JSON data is null.");

    var inv = new Inventory();

    if (rawData["GemItemsPurchased"] is JValue gemItemValue) {
      var gemItemsPurchased = JArray.Parse(gemItemValue.ToString(CultureInfo.InvariantCulture));
      inv.FlaggyShopUpgrades = (int)gemItemsPurchased[184];
    }

    if (rawData["CogM"] is JValue cogValue) {
      var cogM = JObject.Parse(cogValue.ToString(CultureInfo.InvariantCulture));

      var cogDict = cogM.Properties()
        .ToDictionary(
          prop => int.Parse(prop.Name),
          prop => {
            var keyNum = int.Parse(prop.Name);
            var c = (JObject)prop.Value;
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
      var flagPArray = JArray.Parse(flagPValue.ToString(CultureInfo.InvariantCulture));
      var newFlagPose = flagPArray.Where(v => v.Value<int>() >= 0).Select(v => v.Value<int>()).ToList();
      inv.FlagPose = newFlagPose;
    }

    if (rawData["FlagU"] is not JValue flagUValue) return inv;
    var flagUArray = JArray.Parse(flagUValue.ToString(CultureInfo.InvariantCulture));

    Dictionary<int, Cog> slotsFlags = [];

    foreach (var (n, i) in flagUArray.Select((n, i) => (n, i))) {
      var value = n.Value<int>();
      if (value > 0 && inv.FlagPose.Contains(i)) {
        slotsFlags[i] = new Cog {
          Key = i,
          IsFlag = true,
          Fixed = true,
          Blocked = true,
        };
      }
      else if (value != -11) {
        slotsFlags[i] = new Cog {
          Key = i,
          Fixed = true,
          Blocked = true,
        };
      }
      else {
        slotsFlags[i] = new Cog {
          Key = i,
        };
      }
    }

    inv.Slots = slotsFlags;

    foreach (var slotV in slotsFlags.Select(slot => slot.Value).Where(slotV => !slotV.Fixed)) {
      if (inv.AvailableSlotKeys.Contains(slotV.Key)) {
        inv.AvailableSlotKeys.Remove(slotV.Key);
      }

      inv.AvailableSlotKeys.Add(slotV.Key);
    }

    return inv;
  }
}

