import { describe, expect, it } from "vitest";
import { pickCategoryCovers } from "./covers";

describe("pickCategoryCovers", () => {
  it("a kurált (unsplash) kép megelőzi a kiemelt feltöltött mintaképet", () => {
    const map = pickCategoryCovers([
      { category_id: "water", url: "samples/water/1.jpg", source: "uploaded", is_featured: true, sort_order: 1 },
      { category_id: "water", url: "unsplash/sailing.jpg", source: "unsplash", is_featured: true, sort_order: 0 },
      { category_id: "water", url: "unsplash/surf.jpg", source: "unsplash", is_featured: false, sort_order: 1 },
    ]);
    expect(map.water).toBe("unsplash/sailing.jpg");
  });

  it("azonos forráson belül a kiemelt, majd a kisebb sort_order nyer", () => {
    const map = pickCategoryCovers([
      { category_id: "hike", url: "b.jpg", source: "unsplash", is_featured: false, sort_order: 0 },
      { category_id: "hike", url: "c.jpg", source: "unsplash", is_featured: true, sort_order: 5 },
      { category_id: "hike", url: "a.jpg", source: "unsplash", is_featured: true, sort_order: 2 },
    ]);
    expect(map.hike).toBe("a.jpg");
  });

  it("ha csak mintakép van, azt adja (nem marad üresen a kategória)", () => {
    expect(pickCategoryCovers([{ category_id: "run", url: "samples/run/1.jpg", source: "uploaded", is_featured: true }]).run).toBe("samples/run/1.jpg");
  });

  it("kategóriánként egy képet ad", () => {
    const map = pickCategoryCovers([
      { category_id: "x", url: "x1", source: "stock" },
      { category_id: "y", url: "y1", source: null },
    ]);
    expect(map).toEqual({ x: "x1", y: "y1" });
  });
});
