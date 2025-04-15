import * as fs from "fs";
import * as path from "path";
import * as babel from "@babel/core";
import shell from "shelljs";

const directories = ["src", "tasks", "templates"];
const outputDir = "dist";

async function compileFile(filePath: string, outputPath: string) {
  const source = fs.readFileSync(filePath, "utf-8");
  const result = await babel.transformAsync(source, {
    presets: [
      ["@babel/preset-typescript"],
      [
        "@babel/preset-env",
        {
          modules: "commonjs",
          targets: {
            node: "current",
          },
        },
      ],
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
          },
        },
      ],
    ],
    filename: filePath,
    sourceMaps: "inline",
    sourceRoot: path.resolve(filePath, ".."),
  });

  if (!result) {
    throw new Error(`Failed to transform ${filePath}`);
  }

  // 确保输出目录存在
  shell.mkdir("-p", path.dirname(outputPath));

  // 写入编译后的文件
  fs.writeFileSync(outputPath, result.code || "");

  // 如果有 sourcemap，也写入
  if (result.map) {
    fs.writeFileSync(`${outputPath}.map`, JSON.stringify(result.map));
  }
}

async function compileDirectory(sourceDir: string, outputDir: string) {
  const files = shell.find(sourceDir);

  for (const file of files) {
    const relativePath = path.relative(sourceDir, file);

    // 跳过目录
    if (fs.statSync(file).isDirectory()) {
      continue;
    }

    if (file.endsWith(".ts")) {
      // 编译 TypeScript 文件
      const outputPath = path.join(
        outputDir,
        relativePath.replace(".ts", ".js"),
      );
      try {
        await compileFile(file, outputPath);
        // console.log(`Successfully compiled ${file}`);
      } catch (error) {
        console.error(`Failed to compile ${file}:`, error);
        throw error;
      }
    } else {
      // 直接复制非 TypeScript 文件
      const outputPath = path.join(outputDir, relativePath);
      shell.mkdir("-p", path.dirname(outputPath));
      shell.cp(file, outputPath);
      // console.log(`Copied ${file}`);
    }
  }
}

async function main() {
  // 创建输出目录
  shell.rm("-rf", outputDir);
  shell.mkdir("-p", outputDir);

  // 编译每个目录
  console.log("Building...");
  for (const dir of directories) {
    // console.log(`Compiling ${dir}...`);
    try {
      await compileDirectory(dir, path.join(outputDir, dir));
      // console.log(`Successfully compiled ${dir}`);
    } catch (error) {
      console.error(`Failed to compile ${dir}:`, error);
      process.exit(1);
    }
  }

  console.log("Building completed");
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
