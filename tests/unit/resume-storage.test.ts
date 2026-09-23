import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), privateDownloadUrl: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { resumeUpload: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/cloudinary", () => ({ cloudinary: { utils: { private_download_url: mocks.privateDownloadUrl } } }));
import { getResumeDownloadUrl } from "@/lib/resume-storage";

afterEach(() => { vi.unstubAllEnvs(); mocks.findFirst.mockReset(); mocks.privateDownloadUrl.mockReset(); });

describe("legacy resume migration", () => {
  it("signs an authenticated legacy asset that predates ResumeUpload", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    mocks.findFirst.mockResolvedValue(null);
    mocks.privateDownloadUrl.mockReturnValue("https://signed.example/resume");
    const url = "https://res.cloudinary.com/testcloud/raw/authenticated/v123/HireKarlo/resumes/legacy.pdf";
    expect(await getResumeDownloadUrl(url)).toBe("https://signed.example/resume");
    expect(mocks.privateDownloadUrl).toHaveBeenCalledWith("HireKarlo/resumes/legacy.pdf", "", expect.objectContaining({ resource_type: "raw", type: "authenticated", attachment: true }));
  });

  it("continues using the stored public ID for new uploads", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    mocks.findFirst.mockResolvedValue({ publicId: "stored-id.pdf" });
    mocks.privateDownloadUrl.mockReturnValue("signed");
    await getResumeDownloadUrl("https://res.cloudinary.com/testcloud/raw/authenticated/v123/path.pdf");
    expect(mocks.privateDownloadUrl.mock.calls[0][0]).toBe("stored-id.pdf");
  });

  it("rejects an unknown delivery type", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    await expect(getResumeDownloadUrl("https://res.cloudinary.com/testcloud/raw/private/path.pdf")).rejects.toThrow("Invalid resume delivery type");
  });
});
