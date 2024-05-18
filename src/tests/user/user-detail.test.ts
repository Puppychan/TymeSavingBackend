import { NextRequest } from "next/server";
import { GET } from "src/app/api/user/[username]/route";
import User from "src/models/user/model";

describe("/api/user/[id]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  test("GET /api/user/[id] - Success", async () => {
    // Mock the functions
    // (User.findOne as jest.Mock).mockResolvedValueOnce({
    //   username: "hakhanhne",
    //   fullname: "Khanh Tran",
    //   email: "hakhanhne@gmail.com",
    // });

    const req = {} as NextRequest;
    const params = { username: "hakhanhne" };

    const res = await GET(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual({
      username: "hakhanhne",
      fullname: "Khanh Tran",
      email: "hakhanhne@gmail.com",
    });
  });

  test("PUT /api/user/[id] - Success", async () => {
    // const { req, res } = createMocks({
    //   method: "PUT",
    //   query: { id: "1" },
    //   body: { name: "Jane Doe" },
    // });

    // await handleUserById(req, res);

    // expect(res._getStatusCode()).toBe(200);
    // expect(JSON.parse(res._getData()).name).toEqual("Jane Doe");
  });

  test("DELETE /api/user/[id] - Success", async () => {
    // const { req, res } = createMocks({
    //   method: "DELETE",
    //   query: { id: "1" },
    // });

    // await handleUserById(req, res);

    // expect(res._getStatusCode()).toBe(204);
  });
});
