import { parse } from "node-html-parser";
import axios from "axios";
import fs from "fs";
import shell from "shelljs";

// Gathers needed git commands for bash to execute per provided contribution data.
const getCommand = (contribution) => {
  return `GIT_AUTHOR_DATE=${contribution.date}T12:00:00 GIT_COMMITER_DATE=${contribution.date}T12:00:00 git commit --allow-empty -m "Rewriting History!" > /dev/null\n`.repeat(
    contribution.count
  );
};

export default async (input) => {
  // Returns contribution graph html for a full selected year.
  const res = await axios.get(
    `https://github.com/users/${input.username}/contributions?tab=overview&from=${input.year}-01-01&to=${input.year}-12-31`
  );

  // console.log("main - 000", { res });
  let total = 0;

  // Retrieves needed data from the html, loops over green squares with 1+ contributions,
  // and produces a multi-line string that can be run as a bash command.
  const script = parse(res.data)
    .querySelectorAll("[data-date]")
    .map((el) => {
      const textElem = el.childNodes[0].textContent;
      const contributionCount = parseInt(textElem.split(" ")[0]);
      total += isNaN(contributionCount) ? 0 : contributionCount;
      console.log("main - 111", {
        attributes: el.attributes["data-date"],
        contributionCount,
      });
      return {
        date: el.attributes["data-date"],
        count: contributionCount,
      };
    })
    .filter((contribution) => !isNaN(contribution.count))
    .map((contribution) => getCommand(contribution))
    .join("")
    .concat("git pull origin main\n", "git push -f origin main");
  console.log("total - ", { total });

  fs.writeFile("script.sh", script, () => {
    console.log("\nFile was created successfully.");

    if (input.execute) {
      console.log("This might take a moment!\n");
      shell.exec("sh ./script.sh");
    }
  });
};
