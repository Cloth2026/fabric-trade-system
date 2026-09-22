import "dotenv/config";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed config options.");
}

const pool = new Pool({ connectionString: databaseUrl });

const optionGroups = [
  {
    group: "development_source",
    options: [
      ["self_developed", "自主研发"],
      ["market_purchase", "市场采购"],
      ["customer_sample", "客户来样"],
      ["supplier_provided", "供应商提供"],
      ["trade_show_collected", "展会采集"],
    ],
  },
  {
    group: "fabric_status",
    options: [
      ["incomplete", "待完善"],
      ["sellable", "可销售"],
      ["inactive", "停用"],
      ["eliminated", "淘汰"],
    ],
  },
  {
    group: "knitted_category",
    options: [
      ["single_jersey", "汗布"],
      ["rib", "罗纹"],
      ["interlock", "双面"],
      ["pique", "珠地"],
      ["mesh", "网眼"],
      ["terry", "毛圈"],
      ["fleece", "卫衣布"],
      ["warp_knit", "经编"],
    ],
  },
  {
    group: "woven_category",
    options: [
      ["plain", "平纹"],
      ["twill", "斜纹"],
      ["satin", "缎纹"],
      ["denim", "牛仔"],
      ["poplin", "府绸"],
      ["canvas", "帆布"],
      ["jacquard", "提花"],
    ],
  },
  {
    group: "fabric_structure",
    options: [
      ["plain", "平纹"],
      ["twill", "斜纹"],
      ["satin", "缎纹"],
      ["single_jersey", "单面"],
      ["double_knit", "双面"],
      ["rib", "罗纹"],
      ["mesh", "网眼"],
      ["jacquard", "提花"],
    ],
  },
  {
    group: "elasticity_level",
    options: [
      ["none", "无弹"],
      ["micro", "微弹"],
      ["high", "高弹"],
    ],
  },
  {
    group: "repurchase_status",
    options: [
      ["unknown", "未知"],
      ["repurchasable", "可复购"],
      ["not_repurchasable", "不可复购"],
      ["to_confirm", "需确认"],
    ],
  },
  {
    group: "process_info_status",
    options: [
      ["none", "无"],
      ["pending", "待确认"],
      ["available", "有"],
    ],
  },
  {
    group: "dyeing_process_type",
    options: [
      ["dyeing", "染色"],
      ["printing", "印花"],
      ["washing", "水洗"],
      ["heat_setting", "定型"],
      ["softening", "柔软"],
      ["laminating", "复合"],
    ],
  },
  {
    group: "post_process_type",
    options: [
      ["foil_stamping", "烫金"],
      ["flocking", "植绒"],
      ["crinkling", "压皱"],
      ["embossing", "压花"],
      ["coating", "涂层"],
      ["punching", "冲孔"],
      ["embroidery", "绣花"],
    ],
  },
  {
    group: "inspection_conclusion",
    options: [
      ["not_tested", "未检测"],
      ["qualified", "合格"],
      ["retest_required", "需复检"],
      ["risk", "风险"],
    ],
  },
  {
    group: "fabric_usage",
    options: [
      ["tshirt", "T恤"],
      ["underwear", "内衣"],
      ["loungewear", "家居服"],
      ["sportswear", "运动服"],
      ["shoe_material", "鞋材"],
      ["bag", "箱包"],
      ["neckline", "领口"],
      ["cuff", "袖口"],
      ["hem", "下摆"],
      ["workwear", "工装"],
      ["pants", "裤装"],
      ["coat", "外套"],
      ["shirt", "衬衫"],
      ["school_uniform", "校服"],
      ["uniform", "制服"],
      ["outdoor", "户外服"],
      ["shell_jacket", "冲锋衣"],
      ["skirt", "裙装"],
      ["lining", "里布"],
      ["sleepwear", "睡衣"],
      ["blanket", "毯子"],
      ["hat", "帽子"],
      ["decorative_fabric", "装饰布"],
      ["jeans", "牛仔裤"],
      ["children_wear", "童装"],
    ],
  },
  {
    group: "fabric_season",
    options: [
      ["spring_summer", "春夏"],
      ["autumn_winter", "秋冬"],
    ],
  },
  {
    group: "fabric_certification",
    options: [
      ["oeko_tex", "OEKO-TEX"],
      ["gots", "GOTS"],
      ["bluesign", "BLUESIGN"],
    ],
  },
  {
    group: "sample_status",
    options: [
      ["not_requested", "未取样"],
      ["requested", "已申请"],
      ["received", "已有样品"],
      ["tested", "已测试"],
      ["expired", "样品失效"],
    ],
  },
  {
    group: "sample_request_status",
    options: [
      ["preparing", "待寄出"],
      ["shipped", "已寄出"],
      ["delivered", "客户已签收"],
      ["returned", "已退回"],
      ["closed", "已结束"],
    ],
  },
  {
    group: "sample_feedback_result",
    options: [
      ["pending", "待反馈"],
      ["interested", "有意向"],
      ["comparing", "对比中"],
      ["rejected", "未选中"],
      ["ordered", "已下单"],
    ],
  },
];

async function upsertSystemOption(client, group, key, label, sortOrder) {
  const ownerKey = "system";
  const existing = await client.query(
    'select id from "ConfigOption" where "ownerKey" = $1 and "group" = $2 and "key" = $3 limit 1',
    [ownerKey, group, key],
  );

  if (existing.rowCount) {
    await client.query(
      'update "ConfigOption" set label = $1, "sortOrder" = $2, enabled = true, "updatedAt" = now() where id = $3',
      [label, sortOrder, existing.rows[0].id],
    );
    return;
  }

  await client.query(
    `insert into "ConfigOption"
      (id, "tenantId", "ownerKey", scope, "group", "key", label, "sortOrder", enabled, "isDefault", "createdAt", "updatedAt")
     values
      ($1, null, $2, 'system', $3, $4, $5, $6, true, false, now(), now())`,
    [crypto.randomUUID(), ownerKey, group, key, label, sortOrder],
  );
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("begin");

    for (const optionGroup of optionGroups) {
      for (const [index, [key, label]] of optionGroup.options.entries()) {
        await upsertSystemOption(client, optionGroup.group, key, label, index + 1);
      }
    }

    await client.query("commit");
    console.log(`Seeded ${optionGroups.length} config option groups.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    if (error?.code === "ECONNREFUSED") {
      console.error(
        "Cannot connect to PostgreSQL. Please start the local database defined by DATABASE_URL before running seed.",
      );
      process.exitCode = 1;
      return;
    }

    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
