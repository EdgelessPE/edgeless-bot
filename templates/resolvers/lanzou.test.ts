import assert from "node:assert/strict";
import test from "node:test";
import { extractLanzouAjaxRequest } from "./lanzou";

test("extractLanzouAjaxRequest supports ajaxfile download pages", (): void => {
  const html = `
    <script>
      var wp_sign = 'example-sign';
      var ajaxdata = 'DgMi';
      var kdns = 1;
      $.ajax({
        type: 'post',
        url: '/ajaxfile.php?file=314301503',
        data: {
          'action': 'downprocess',
          'websignkey': ajaxdata,
          'signs': ajaxdata,
          'sign': wp_sign,
          'websign': '',
          'kd': kdns,
          'ves': 1
        },
        dataType: 'json'
      });
    </script>
  `;

  assert.deepEqual(extractLanzouAjaxRequest(html), {
    url: "/ajaxfile.php?file=314301503",
    data: {
      action: "downprocess",
      websignkey: "DgMi",
      signs: "DgMi",
      sign: "example-sign",
      websign: "",
      kd: 1,
      ves: 1,
    },
  });
});
