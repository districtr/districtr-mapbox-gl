
import React from "react";
import { render } from "@testing-library/react";

import Cursor from "./Cursor";
import { CursorProps } from "./Cursor.types";

describe("Test Component", () => {
  let props: CursorProps;

  beforeEach(() => {
    props = {
      foo: "bar"
    };
  });

  const renderComponent = () => render(<Cursor {...props} />);

  it("should render foo text correctly", () => {
    props.foo = "test foo text";
    const { getByTestId } = renderComponent();

    const component = getByTestId("Cursor");

    expect(component).toHaveTextContent("test foo text");
  });
});
