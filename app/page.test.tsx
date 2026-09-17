import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("홈 화면은 게임 제목과 시작 버튼을 보여준다", () => {
  render(<Home />);

  expect(screen.getByText("심해 탈출 런")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "시작" })).toBeInTheDocument();
});
